<script>
    import DomRasterizationSourceElement from '../DomRasterizationSourceElement/DomRasterizationSourceElement.svelte';
    import {parseColorFromString, luminanceFromRGBA} from '../../../util/color.js';

    export let sourceRef;
    export let cursorRef;
    export let uniforms;
    export let refreshImageOnEvent;
    export let mouseUpHandler;

    let contrastColor = 'black';
    let text = 'orange';
    $: inputFocused = false;
    $: buttonActive = false;

    $: if (text) {
        const color = parseColorFromString(text);
        if (Boolean(color)) {
            uniforms.u_color.value = Object.values(color);
            const luminance = luminanceFromRGBA(color, { r: 1, g: 1, b: 1 });
            contrastColor = luminance > 0.5 ? 'black' : 'white';
        }
    }
</script>

<DomRasterizationSourceElement
    {refreshImageOnEvent}
    {mouseUpHandler}
    bind:buttonActive
    bind:inputFocused
    bind:ref={sourceRef}
    text={text}
    {contrastColor}
/>
<DomRasterizationSourceElement
        {refreshImageOnEvent}
        {mouseUpHandler}
        bind:buttonActive
        bind:inputFocused
        bind:ref={cursorRef}
        isCursorCopy={true}
        bind:text
        {contrastColor}
/>