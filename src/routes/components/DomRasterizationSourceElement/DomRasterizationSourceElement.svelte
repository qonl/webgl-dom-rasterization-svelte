<script>
    export let ref;
    export let text;
    export let contrastColor;
    export let isCursorCopy = false;
    export let refreshImageOnEvent;
    export let mouseUpHandler;
    export let inputFocused;
    export let buttonActive;

    $: textColor = isCursorCopy ? 'transparent' : contrastColor;
    $: contrastOpposite = contrastColor === 'white' ? 'black' : 'white';
    $: hoverButtonColor = isCursorCopy ? 'transparent' : contrastOpposite;
    $: buttonColor = buttonActive ? hoverButtonColor : textColor;
    $: buttonBackground = buttonActive ? textColor : 'transparent';
    $: buttonBorder = isCursorCopy ? '1px solid transparent' : `1px solid ${contrastColor}`;
    $: inputBorder = inputFocused ? `1px solid ${textColor}` : `1px solid transparent`;
</script>

<div
        on:mousemove={refreshImageOnEvent}
        on:keydown={refreshImageOnEvent}
        on:keyup={refreshImageOnEvent}
        on:mouseup={mouseUpHandler}
        bind:this={ref}
        class="canvas-foreground source-element"
        class:cursor-copy={isCursorCopy}
        style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; margin: 0; padding: 0;"
>
    <div
            style="margin: 0; padding: 0;"
    >
        <form
                style="display: flex; flex-direction: column; align-items: flex-start;"
        >
            <label
                    for="color-field"
                    style={`margin-bottom: 80px; font-size: 40px; color: ${textColor}; font-family: 'Roboto', sans-serif; font-weight: bold;`}
            >
                type a color
            </label>
            <input
                    on:focus={() => inputFocused = true}
                    on:blur={() => inputFocused = false}
                    type="text"
                    id="color-field"
                    class="form-input"
                    bind:value={text}
                    style={`width: 200px; background-color: transparent; border-top: ${inputBorder}; border-right: ${inputBorder}; border-bottom: ${buttonBorder}; border-left: ${inputBorder}; color: ${textColor}; caret-color: transparent; font-size: 40px; min-width: 500px; padding: 8px 20px; font-family: 'Roboto', sans-serif; font-weight: bold; margin-bottom: 40px;`}
            />
            <button
                    on:mouseover={() => buttonActive = true}
                    on:mouseleave={() => buttonActive = false}
                    class="form-button"
                    type="button"
                    style={`background: ${buttonBackground}; border: ${buttonBorder}; color: ${buttonColor}; font-size: 28px; font-weight: bold; font-family: 'Roboto', sans-serif; padding: 10px 20px;`}
                    on:click={() => text = ' '}
                    tabindex="0"
            >
                clear
            </button>
        </form>
    </div>
</div>

<style lang="scss">
    .canvas-foreground {
        opacity: 0;

        &.source-element {
            &.cursor-copy {
                opacity: 1;
            }
            &:not(.cursor-copy) {
                visibility: hidden;
            }
        }
    }

    .form-input {
        outline: none;
    }

    .form-button {
        cursor: pointer;
    }
</style>