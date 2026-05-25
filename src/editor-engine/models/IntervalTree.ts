export class IntervalNode {
    interval: { start: number, end: number };
    max: number;
    clip: any;
    left: IntervalNode | null;
    right: IntervalNode | null;

    constructor(clip: any) {
        this.interval = { start: clip.start, end: clip.start + clip.duration };
        this.max = this.interval.end;
        this.clip = clip;
        this.left = null;
        this.right = null;
    }
}

export class IntervalTree {
    root: IntervalNode | null;

    constructor() { this.root = null; }

    insert(clip: any) {
        const newNode = new IntervalNode(clip);
        if (!this.root) this.root = newNode;
        else this._insertNode(this.root, newNode);
    }
    
    _insertNode(node: IntervalNode, newNode: IntervalNode) {
        if (newNode.max > node.max) node.max = newNode.max;
        if (newNode.interval.start < node.interval.start) {
            if (!node.left) node.left = newNode;
            else this._insertNode(node.left, newNode);
        } else {
            if (!node.right) node.right = newNode;
            else this._insertNode(node.right, newNode);
        }
    }
    
    query(time: number) {
        const result: any[] = [];
        this._queryNode(this.root, time, result);
        return result;
    }
    
    _queryNode(node: IntervalNode | null, time: number, result: any[]) {
        if (!node) return;
        if (time > node.max) return;
        if (node.clip.start <= time && node.clip.end > time) result.push(node.clip);
        if (node.left && node.left.max >= time) this._queryNode(node.left, time, result);
        this._queryNode(node.right, time, result);
    }
    
    clear() { this.root = null; }
    search(time: number) { return this.query(time); }
}
