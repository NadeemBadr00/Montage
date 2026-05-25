// @ts-ignore
import * as MP4Box from 'mp4box';

/**
 * Represents an internal buffer holding decoded hardware frames awaiting consumption.
 */
interface DecodedFrameBuffer {
    frame: VideoFrame;
    timestampSec: number;
}

export class MP4Decoder {
    private mp4boxfile: any;
    private videoDecoder: VideoDecoder | null = null;
    private decoderConfig: VideoDecoderConfig | null = null;
    private videoTrack: any = null;
    
    private samples: any[] = [];
    private currentSampleIndex: number = 0;
    
    // Internal queue mechanism to trap decoded VideoFrames from the async callback
    private frameQueue: DecodedFrameBuffer[] = [];
    private frameResolver: ((frame: VideoFrame) => void) | null = null;
    private targetTimestampSec: number | null = null;
    
    // State machine flags for sequence detection and backpressure
    private isDecoderReady: boolean = false;
    private lastDecodedTimestampSec: number = -1;
    private maxQueueSize: number = 5;

    constructor() {
        this.mp4boxfile = MP4Box.createFile();
    }

    /**
     * Bootstraps the progressive demuxer, loads the binary file buffer, and extracts 
     * global presentation metadata.
     */
    public async initialize(fileBlob: Blob): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("[MP4Decoder] Starting initialization...");
            this.mp4boxfile.onError = (e: any) => {
                console.error("[MP4Decoder] MP4Box Error:", e);
                reject(`MP4Box Error: ${e}`);
            };
            this.mp4boxfile.onReady = (info: any) => {
                console.log("[MP4Decoder] MP4Box onReady fired! Track info:", info);
                try {
                    this.extractTrackAndConfigure(info);
                    resolve();
                } catch (e) {
                    console.error("[MP4Decoder] extractTrackAndConfigure failed:", e);
                    reject(e);
                }
            };

            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                console.log("[MP4Decoder] FileReader loaded buffer of size:", arrayBuffer.byteLength);
                (arrayBuffer as any).fileStart = 0;
                try {
                    this.mp4boxfile.appendBuffer(arrayBuffer);
                    console.log("[MP4Decoder] appendBuffer completed");
                    this.mp4boxfile.flush();
                    console.log("[MP4Decoder] flush completed");
                } catch(err) {
                    console.error("[MP4Decoder] error appending buffer", err);
                    reject(err);
                }
            };
            fileReader.onerror = (err) => {
                console.error("[MP4Decoder] FileReader error:", err);
                reject(err);
            }
            fileReader.readAsArrayBuffer(fileBlob);
        });
    }

    /**
     * Extracts the primary video track, parses the codec description box (stripping the 8-byte 
     * ISOBMFF box header), and initializes the WebCodecs VideoDecoder hardware.
     */
    private extractTrackAndConfigure(info: any): void {
        const track = info.videoTracks[0];
        if (!track) throw new Error("No video track found in ISOBMFF container.");
        this.videoTrack = track;

        const trak = this.mp4boxfile.getTrackById(track.id);
        let description: Uint8Array | undefined;
        
        // Traverse the nested box hierarchy to locate the decoder configuration record
        // Fallback to reading the codec directly if stsd entries are missing or undefined
        if (trak.mdia?.minf?.stbl?.stsd?.entries) {
            for (const entry of trak.mdia.minf.stbl.stsd.entries) {
                const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
                if (box) {
                    // Initialize a Big Endian DataStream to serialize the box contents
                    const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
                    box.write(stream);
                    // CRUCIAL REQUIREMENT: Slice the 8-byte MP4 Box header (4 bytes size, 4 bytes type)
                    description = new Uint8Array(stream.buffer, 8);
                    break;
                }
            }
        }

        if (!description) {
            console.warn("Codec configuration box not found in stsd entries. Decoder may fail.");
        }

        this.decoderConfig = {
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description: description
        };

        // Instruct MP4Box to extract all NAL units for this track into an array
        this.mp4boxfile.setExtractionOptions(track.id, null, { nbSamples: Infinity });
        this.mp4boxfile.onSamples = (id: any, user: any, samples: any) => {
            this.samples = samples;
        };
        this.mp4boxfile.start();

        this.setupVideoDecoder();
    }

    /**
     * Instantiates the VideoDecoder, capturing asynchronous output frames and strictly 
     * managing the memory lifecycle of discarded delta frames.
     */
    private setupVideoDecoder(): void {
        this.videoDecoder = new VideoDecoder({
            output: (frame: VideoFrame) => {
                const frameTimeSec = frame.timestamp / 1_000_000;
                this.frameQueue.push({ frame, timestampSec: frameTimeSec });
                if (this.frameResolver) {
                    this.frameResolver();
                }
            },
            error: (e) => console.error("[MP4Decoder] Hardware VideoDecoder Error:", e)
        });

        this.videoDecoder.configure(this.decoderConfig!);
        this.isDecoderReady = true;
    }

    private async startFeedLoop() {
        if (!this.videoTrack) return;
        this.feedLoopId++;
        const currentLoopId = this.feedLoopId;
        const timescale = this.videoTrack.movie_timescale || 1000;

        try {
            while (this.currentSampleIndex < this.samples.length && this.feedLoopId === currentLoopId) {
                if (this.videoDecoder!.decodeQueueSize >= this.maxQueueSize) {
                    await this.waitForDecoderDrain();
                }
                if (this.feedLoopId !== currentLoopId) break;

                const sample = this.samples[this.currentSampleIndex];
                const chunk = new EncodedVideoChunk({
                    type: sample.is_sync ? "key" : "delta",
                    timestamp: (sample.cts / timescale) * 1_000_000,
                    duration: (sample.duration / timescale) * 1_000_000,
                    data: sample.data
                });

                this.videoDecoder!.decode(chunk);
                this.currentSampleIndex++;
            }
        } catch (e) {
            console.error("[MP4Decoder] Feed loop error:", e);
        }
    }

    private activeFrame: VideoFrame | null = null;
    private activeTimestampSec: number = -1;
    private feedLoopId: number = 0;
    private drainResolvers: Array<() => void> = [];

    /**
     * Primary interface for the NLE Export Loop. Retrieves the exact frame at the specified time.
     * Uses a background feed loop to prevent WebCodecs pipelining stalls.
     */
    public async getFrameAtTime(targetSec: number): Promise<VideoFrame> {
        this.targetTimestampSec = targetSec;

        const isSequential = targetSec >= this.lastDecodedTimestampSec && 
                             targetSec < this.lastDecodedTimestampSec + 0.5;

        if (!isSequential) {
            this.feedLoopId++; // Immediately invalidate any running feed loops
            await this.seekToNearestKeyframe(targetSec);
            this.startFeedLoop();
        } else if (this.feedLoopId === 0) {
            // First run
            this.startFeedLoop();
        }

        return new Promise<VideoFrame>((resolve) => {
            const checkQueue = () => {
                const isDecoderFinished = this.currentSampleIndex >= this.samples.length && this.videoDecoder!.decodeQueueSize === 0;

                // Shift all frames that are older than targetSec into activeFrame
                while (this.frameQueue.length > 0 && this.frameQueue[0].timestampSec <= targetSec + 0.002) {
                    const buffered = this.frameQueue.shift()!;
                    if (this.activeFrame) {
                        try { this.activeFrame.close(); } catch(e){}
                    }
                    this.activeFrame = buffered.frame;
                    this.activeTimestampSec = buffered.timestampSec;
                    this.lastDecodedTimestampSec = buffered.timestampSec;
                }

                // Fallback: If video starts later than targetSec (e.g. first PTS is 0.083s), grab the first future frame!
                if (!this.activeFrame && this.frameQueue.length > 0) {
                    const buffered = this.frameQueue.shift()!;
                    this.activeFrame = buffered.frame;
                    this.activeTimestampSec = buffered.timestampSec;
                    this.lastDecodedTimestampSec = buffered.timestampSec;
                }

                if (this.activeFrame) {
                    const isPerfectMatch = Math.abs(this.activeTimestampSec - targetSec) < 0.015;
                    const passedTarget = this.activeTimestampSec > targetSec;
                    const hasFutureFrame = this.frameQueue.length > 0;

                    // Resolve if we have a future frame (meaning activeFrame is best),
                    // OR decoder finished, OR we've passed the target, OR it's a perfect match.
                    if (isPerfectMatch || passedTarget || hasFutureFrame || isDecoderFinished) {
                        this.frameResolver = null;
                        resolve(this.activeFrame.clone());
                        return;
                    }
                }

                // Otherwise, wait for more frames to arrive
                this.frameResolver = checkQueue;
            };
            checkQueue();
        });
    }

    /**
     * Executes a deterministic seek by locating the preceding Sync Sample (I-Frame),
     * flushing the hardware decoder, and resetting the array index pointer.
     */
    private async seekToNearestKeyframe(targetSec: number): Promise<void> {
        if (!this.videoTrack) return;
        const timescale = this.videoTrack.movie_timescale || 1000;
        const targetCTS = targetSec * timescale;

        // Iterate backwards to locate the closest Random Access Point
        let syncIndex = 0;
        for (let i = 0; i < this.samples.length; i++) {
            if (this.samples[i].cts > targetCTS) break;
            if (this.samples[i].is_sync) {
                syncIndex = i;
            }
        }

        this.currentSampleIndex = syncIndex;

        // Purge out-of-order buffers and reinitialize hardware state
        if (this.videoDecoder!.state !== "closed") {
            try {
                this.videoDecoder!.reset();
                this.videoDecoder!.configure(this.decoderConfig!);
            } catch (e) {
                console.error("Failed to reset decoder", e);
            }
        }
        
        // Force resolve any pending drain waits
        const resolvers = this.drainResolvers;
        this.drainResolvers = [];
        resolvers.forEach(r => r());
        
        // Explicitly clear any stale frames lingering in the queue
        this.frameQueue.forEach(f => { try { f.frame.close(); } catch(e){} });
        this.frameQueue = [];
        
        if (this.activeFrame) {
            try { this.activeFrame.close(); } catch(e){}
            this.activeFrame = null;
            this.activeTimestampSec = -1;
        }
    }

    /**
     * Suspends execution until the decoder clears its internal processing queue.
     */
    private waitForDecoderDrain(): Promise<void> {
        return new Promise((resolve) => {
            if (this.videoDecoder!.decodeQueueSize < this.maxQueueSize) {
                resolve();
                return;
            }
            
            this.drainResolvers.push(resolve);
            
            const check = () => {
                if (this.videoDecoder!.decodeQueueSize < this.maxQueueSize) {
                    this.videoDecoder!.removeEventListener('dequeue', check);
                    const resolvers = this.drainResolvers;
                    this.drainResolvers = [];
                    resolvers.forEach(r => r());
                }
            };
            this.videoDecoder!.addEventListener('dequeue', check);
        });
    }

    /**
     * Safely dismantles the decoding infrastructure and recycles all associated memory.
     */
    public destroy(): void {
        if (this.videoDecoder && this.videoDecoder.state !== "closed") {
            try { this.videoDecoder.close(); } catch(e){}
        }
        this.frameQueue.forEach(f => { try { f.frame.close(); } catch(e){} });
        this.frameQueue = [];
        this.mp4boxfile.flush();
    }
}
