export function createSlider (min, max, value, step, text, valueChangeHandler) {
    // Find or create a all sliders container
    let parent = getOrCreateParent();


    const container =  document.createElement('div');
    const label =  document.createElement('div');
    const elt = document.createElement('input');
    label.setAttribute('style', "background: #00000070; color: white; font-family: monospace; font-size: small");
    container.setAttribute('style', "display: flex;");

    const changeHandler = () => {
        if (valueChangeHandler) { valueChangeHandler(Number(elt.value)) }
        label.textContent = `${text} [${min}, ${max}] = ${elt.value}`;
    };

    elt.addEventListener('input', changeHandler);

    elt.setAttribute('style', "accent-color: #000000; border-radius: 16px; cursor: pointer; outline: none; appearance: none; background: #0f1f42ad; color: white; font-family: monospace; font-size: small");

    elt.type = 'range';
    elt.min = min;
    elt.max = max;
    if (step === 0) {
      elt.step = 0.000000000000000001; // smallest valid step
    } else if (step) {
      elt.step = step;
    }
    if (typeof value === 'number') elt.value = value;

    changeHandler();

    container.appendChild(elt);
    container.appendChild(label);
    parent.appendChild(container);
    return elt;
};

function getOrCreateParent() {
  let parent = document.getElementById('p5sliders');
  if (!parent) {
    parent = document.createElement('div');
    parent.setAttribute('id', 'p5sliders');
    // Abs position, top left
    parent.setAttribute('style', "position: absolute; top: 0; left: 0; background: #21428840; color: white; font-family: monospace; font-size: large");
    document.body.appendChild(parent);
  }
  return parent;
}

export function createButton(text, clickHandler) {
  let parent = getOrCreateParent();

  const button = document.createElement('button');
  button.textContent = text;
  button.setAttribute('style', "accent-color: #000000; border-radius: 16px; cursor: pointer; outline: none; appearance: none; background: #0f1f42ad; color: white; font-family: monospace; font-size: small");
  button.addEventListener('click', clickHandler);

  parent.appendChild(button);
}
export function createSliderBox(min, max, value, step, text, valueChangeHandler, x, y, w, h) {
  const container = document.createElement('div');
  const label = document.createElement('div');
  const elt = document.createElement('input');
  label.setAttribute('style', "background: #214288; color: white; font-family: monospace; font-size: large; padding: 2px;");
  container.setAttribute('style', `display: flex; flex-direction: column; position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; align-items: center; justify-content: center;`);

  const changeHandler = () => {
      if (valueChangeHandler) { valueChangeHandler(Number(elt.value)); }
      label.textContent = `${text} [${min}, ${max}] = ${elt.value}`;
  };

  elt.addEventListener('input', changeHandler);

  elt.type = 'range';
  elt.min = min;
  elt.max = max;
  elt.style.width = `${w}px`; // Adjust the slider width to fill the container
  if (step === 0) {
    elt.step = 0.000000000000000001; // smallest valid step
  } else if (step) {
    elt.step = step;
  }
  if (typeof value === 'number') elt.value = value;

  changeHandler();

  container.appendChild(elt);
  container.appendChild(label);
  document.body.appendChild(container);
  return elt;
};

// Center the p5 canvas in window
export function centerCanvas(canvas) {
  let container = document.getElementById('canvasContainer');
  
  // If the container doesn't exist, create it
  if (!container) {
    container = document.createElement('div');
    container.id = 'canvasContainer';
    document.body.appendChild(container);
  }

  const elt = canvas.elt;

  const x = (window.innerWidth - canvas.width) / 2;
  const y = (window.innerHeight - canvas.height) / 2;
  elt.style.position = 'absolute';
  elt.style.left = `${x}px`;
  elt.style.top = `${y}px`;

  // Append the canvas to the container
  container.appendChild(elt);
}
