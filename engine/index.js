import Layer from './layer.js';
import Item from './item.js';
import TransformationMatrix from './transformationMatrix.js';
import handlePointerInputEvent from './pointerInputHandler.js';

export default class Engine {
    constructor(render, input, viewport) {
        this.render = render;
        this.frames = 0;
        this.fps = 0;
        this.lastFPSUpdate = 0;
        this.layers = {};
        this.orderedLayers = [];
        this.input = Array.isArray(input) ? input : [input];
        this.setViewport(viewport);
        this.worldMatrix = new TransformationMatrix();
        this.worldMatrix.moveTo(viewport.width / 2, viewport.height / 2);
        this.currentMatrix = this.worldMatrix;
        this.render.setTransform(...this.worldMatrix.get());
        this.matrices = [];
        this.stage = this.create(Item, 0, 0);

        handlePointerInputEvent(this);
    }

    screenToWorld(x, y) {
        x -= this.worldMatrix.moveX;
        y -= this.worldMatrix.moveY;

        return { x, y };
    }

    create(Class, ...args) {
        const instance = new Class(this);
        instance.init(...args);
        return instance;
    }

    createLayer(name) {
        const layer = new Layer();

        this.layers[name] = layer;
        this.orderedLayers.splice(this.orderedLayers.length, 0, layer);

        return layer;
    }

    setViewport(viewport) {
        this.viewport = viewport;
    }

    clear() {
        this.render.clearRect(0, 0, this.viewport.width, this.viewport.height);
    }

    renderItem(item) {
        const { localMatrix } = item;

        this.render.save();
        this.matrices.push(this.currentMatrix);
        this.currentMatrix = this.currentMatrix.multiply(localMatrix);
        this.render.setTransform(this.currentMatrix.scaleX, this.currentMatrix.skewX, this.currentMatrix.skewY, this.currentMatrix.scaleY, this.currentMatrix.moveX, this.currentMatrix.moveY);

        if (!item.skipSelfDraw) {
            item.draw(this.render);
        }

        for (const children of item.children) {
            this.renderItem(children);
        }

        this.render.restore();
        this.currentMatrix = this.matrices.pop();
    }

    start() {
        this.renderFrame();
    }

    stop() {
        cancelAnimationFrame(this.rafId);
    }

    renderFrame() {
        this.rafId = requestAnimationFrame(() => {
            this.clear();

            for (const { items } of this.orderedLayers) {
                for (const item of items) {
                    this.renderItem(item);
                }
            }

            this.renderFrame();

            /////////////////////

            this.frames++;

            const now = performance.now();

            if (now - this.lastFPSUpdate >= 1000) {
                this.lastFPSUpdate = now;

                this.fps = this.frames;
                this.frames = 0;
            }

            this.renderFPS();
        });
    }

    renderFPS() {
        this.render.save();
        this.render.setFont('12px Helvetica');
        this.render.fillText(`${this.fps} FPS`, 10, 30);
        this.render.restore();
    }
}