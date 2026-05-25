// @ts-nocheck
export interface PlanItem {
    action: 'upload' | 'modify';
    track_id: number;
    start: number;
    end: number;
    desc: string;
    asset_query: string;
    cli_cmd: string;
    custom_src?: string;
    custom_type?: 'video' | 'image';
    custom_name?: string;
}

export interface PreviewRange {
    start: number;
    end: number;
}
