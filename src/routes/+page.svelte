<script>
    import {BASE_UNIFORMS, glSupported} from '../util/general.js';
    import DomRasterizationCanvas from './components/DomRasterizationCanvas/DomRasterizationCanvas.svelte';
    import {vertexShader} from '../lib/gl/shaders/dom-rasterization-canvas/vertexShader.js';
    import {fragmentShader} from '../lib/gl/shaders/dom-rasterization-canvas/fragmentShader.js';
    import {onMount} from 'svelte';

    let INITIAL_UNIFORMS;
    let canUseGl;

    onMount(() => {
        canUseGl = glSupported();
        INITIAL_UNIFORMS = {
            ...BASE_UNIFORMS,
            u_time: { value: 0 },
            u_samplerResolution0: {
                value: {
                    x: 0,
                    y: 0
                }
            },
            u_downSampleFidelity: { value: 10.0 },
            u_color: {
                value: {
                    x: 1.0,
                    y: 0.647,
                    z: 1.0,
                    w: 1.0
                }
            },
            u_mouse: { x: 0.5, y: 0.5 }
        };
    });
</script>

{#if !canUseGl}
    <div>WebGL is not supported on this device.</div>
{:else}
    <DomRasterizationCanvas
            {fragmentShader}
            {vertexShader}
            uniforms={INITIAL_UNIFORMS}
    />
{/if}