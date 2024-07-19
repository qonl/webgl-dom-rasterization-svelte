<script>
    import * as THREE from 'three';
    import {onMount, tick} from 'svelte';
    import DomRasterizationSource from '../DomRasterizationSource/DomRasterizationSource.svelte';
    import {throttle} from '../../../util/general.js';

    export let fragmentShader;
    export let vertexShader;
    export let uniforms;

    let debugImg;
    let toggleDebugImg = false;

    let MAX_IDLE = 1000;
    let canvas;
    let size = {
        x: uniforms.u_resolution.value.x * window.devicePixelRatio,
        y: uniforms.u_resolution.value.y * window.devicePixelRatio,
    };
    let initialMousePosition = uniforms.u_mouse;
    let mousePosRef;
    let sourceElementRef;
    let cursorElementRef;
    let scene;
    let renderer;
    let camera;
    let mesh;
    let geometry;
    let material;
    let clock;
    let imageTextures;
    let request;
    let idle = false;
    let idleTimer = 0;
    let previousIdleTime = 0;
    let refreshImageOnEvent;
    let mouseUpHandler;

    const allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

    onMount(async () => {
        await tick();
        initScene();

        mousePosRef = {
            x: size.x * initialMousePosition.x,
            y: size.y * -initialMousePosition.y
        };

        initListeners();
        await rasterize();
        animate();
        handleResize();

        refreshImageOnEvent = throttle(30, refreshImage);
        mouseUpHandler = setTimeout(() => refreshImage(), 0);

        return () => {
            cursorElementRef.removeEventListener('mousemove', refreshImageOnEvent);
            cursorElementRef.removeEventListener('keydown', refreshImageOnEvent);
            cursorElementRef.removeEventListener('keyup', refreshImageOnEvent);
            cursorElementRef.removeEventListener('mouseup', mouseUpHandler);
            cancelAnimationFrame(request);
        }
    });

    function initScene() {
        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setClearColor(0, 0, 0, 0);

        const aspect = canvas.offsetWidth / canvas.offsetHeight;
        camera = new THREE.OrthographicCamera(
            canvas.offsetWidth / -2,
            canvas.offsetWidth / 2,
            canvas.offsetHeight / 2,
            canvas.offsetHeight / -2,
            0.1,
            10
        );

        camera.position.z = 1;
        clock = new THREE.Clock();
        geometry = new THREE.PlaneGeometry(canvas.offsetWidth, canvas.offsetHeight, 1);

        material = new THREE.ShaderMaterial({
            uniforms: {
                ...uniforms,
                u_diffuse0: { value: null }
            },
            vertexShader,
            fragmentShader,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }

    function rasterize () {
        if (!sourceElementRef) {
            initScene();
            return;
        }
        rasterizeElementAndInitScene();
    }

    async function refreshImage () {
        const { DOMImage, size } = await rasterizeElement(sourceElementRef);
        imageTextures = { DOMImage };
        material.uniforms.u_samplerResolution0.value = size;
        await loadTextures({ DOMImage });
    }

    async function rasterizeElementAndInitScene () {
        const { DOMImage, size } = await rasterizeElement(sourceElementRef);
        imageTextures = { DOMImage };
        material.uniforms.u_samplerResolution0.value = size;
        initScene();
    }

    async function rasterizeElement (source) {
        if (!source) return;

        // todo: svelte is annoying sometimes
        const input = source.querySelector('input');
        if (input) {
            input.setAttribute('value', input.value);
        }

        const { width, height } = source.getBoundingClientRect();
        const svgDataURI = makeSvgDataURI(source, width, height);
        const image = await createImageFromURI(svgDataURI);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const png = canvas.toDataURL();
        if (toggleDebugImg) debugImg.src = png;
        return {
            DOMImage: png,
            size: {
                x: width * window.devicePixelRatio,
                y: height * window.devicePixelRatio
            }
        }
    }

    function makeSvgDataURI(node, width, height) {
        node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        const clonedNode = node.cloneNode(true);

        const inputs = clonedNode.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('value', input.value);
        });

        const serializedNode = new XMLSerializer().serializeToString(clonedNode);
        const escapedNode = escapeXhtml(serializedNode);
        return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${escapedNode}</foreignObject></svg>`;
    }


    function escapeXhtml (str) {
        return str.replace(/#/g, '%23').replace(/\n/g, '%0A');
    }

    function createImageFromURI (url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = e => reject(e);
            image.src = url;
        });
    }

    async function loadTextures (images) {
        if (images) {
            return loadImageTextures(images).then(loadedTextures => {
                bindTextures(material, loadedTextures);
                return loadedTextures;
            });
        }
    }

    async function loadImageTextures(images) {
        const promises = Object.keys(images).map(name => initTexture(name, images[name]));
        return Promise.all(promises).then(loadedImages => {
            const loadedTextures = {};
            loadedImages.forEach(({ name, texture }) => {
                if (texture) {
                    loadedTextures[name] = texture;
                }
            });
            return loadedTextures;
        });
    }

    async function initTexture(name, source) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            const loadedTexture = loader.load(
                source,
                texture => {
                    // console.log(`Texture loaded for ${name}`, texture); // Debugging output
                    resolve({ name, texture });
                },
                undefined,
                error => reject(error)
            );
        });
    }

    function bindTextures (material, textures) {
        // console.log('bindTextures');
        const max = 5;
        Object.keys(textures).forEach((name, i) => {
            if (i <= max) {
                material.uniforms[`u_diffuse${i}`].value = textures[name];
                // console.log(`Assigned texture ${name} to u_diffuse${i}`, textures[name]);
            }
        });
        material.needsUpdate = true;
    }

    function animate (time) {
        if (idle) {
            return;
        } else if (idleTimer > MAX_IDLE) {
            cancelAnimationFrame(request);
            idle = true;
            return;
        }

        uniforms.u_time.value = time;
        idleTimer++;
        previousIdleTime = time;
        renderer.render(scene, camera);
        request = requestAnimationFrame(animate);
    }

    function initListeners () {
        if (cursorElementRef) {
            cursorElementRef.addEventListener('mousemove', refreshImageOnEvent);
            cursorElementRef.addEventListener('keydown', refreshImageOnEvent);
            cursorElementRef.addEventListener('keyup', refreshImageOnEvent);
            cursorElementRef.addEventListener('mouseup', mouseUpHandler);
        }
    }

    function handleScroll () {
        if (!canvas) return;
        const { y, height } = canvas.getBoundingClientRect();
        const topAboveBottom = y < window.innerHeight;
        const bottomBelowTop = y + height > 0;
        const inView = topAboveBottom && bottomBelowTop;

        if (!inView && !idle) {
            cancelAnimationFrame(request);
            idle = true;
        } else if (inView && idle) {
            // Reset idle timer and restart animation
            idleTimer = 0;
            request = requestAnimationFrame(animate);
            idle = false;
        }
    }

    function handleMouseMove (e) {
        if (!idle) return;
        idleTimer = 0;
        request = requestAnimationFrame(animate);
        idle = false;

        const { left, top } = canvas.getBoundingClientRect();

        mousePosRef = {
            x: (e.clientX - left) * window.devicePixelRatio,
            y: (e.clientY - top) * -window.devicePixelRatio
        };
    }

    function handleResize () {
        if (!canvas) return;
        const { width, height } = canvas.getBoundingClientRect();
        size = {
            x: width * window.devicePixelRatio,
            y: height * window.devicePixelRatio
        };
        canvas.width = size.x;
        canvas.height = size.y;
        material.uniforms.u_resolution.value = size;
        renderer.setSize(size.x, size.y);
        camera.aspect = size.x / size.y;
        camera.updateProjectionMatrix();
    }
</script>

<svelte:window
        on:scroll={handleScroll}
        on:mousemove={handleMouseMove}
        on:touchmove={handleMouseMove}
        on:load={refreshImage}
        on:resize={() => {
            refreshImage();
            handleResize();
        }}
/>

{#if !allowMotion}
    <DomRasterizationSource
        bind:sourceRef={sourceElementRef}
    />
{:else}
    <div class="container">
        <canvas
                class="fullscreen-canvas"
                bind:this={canvas}
                width={size.x}
                height={size.y}
        />
        <DomRasterizationSource
                {mouseUpHandler}
                {refreshImageOnEvent}
                bind:sourceRef={sourceElementRef}
                bind:cursorRef={cursorElementRef}
                {uniforms}
        />
    </div>
    <button class="toggle-image" type="button" on:click={() => toggleDebugImg = !toggleDebugImg}>Toggle Debug Image</button>
    {#if toggleDebugImg}
        <img bind:this={debugImg}>
    {/if}
    {/if}
<style lang="scss">
    .container {
        position: relative;
    }
    .fullscreen-canvas {
        width: calc(100vw - 4rem);
        height: calc((100vw - 4rem) / 3 * 2);
        max-width: calc(100vw - 4rem);
        max-height: calc((100vw - 4rem) / 3 * 2);
        min-width: 100%;
        min-height: 100%;
        position: relative;
    }
    .toggle-image {
        cursor: pointer;
        background: transparent;
        border: 1px solid black;
        color: black;
        font-size: 28px;
        font-weight: bold;
        font-family: 'Roboto', sans-serif;
        padding: 10px 20px;
    }
</style>
