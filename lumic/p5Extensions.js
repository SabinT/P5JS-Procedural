export function createSlider (min, max, value, step, text, valueChangeHandler) {
    const container =  document.createElement('div');
    const label =  document.createElement('div');
    const elt = document.createElement('input');
    label.setAttribute('style', "background: #214288; color: white; font-family: monospace; font-size: large");
    container.setAttribute('style', "display: flex;");

    const changeHandler = () => {
        if (valueChangeHandler) { valueChangeHandler(Number(elt.value)) }
        label.textContent = `${text} [${min}, ${max}] = ${elt.value}`;
    };

    elt.addEventListener('input', changeHandler);

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
    document.body.appendChild(container);
    return elt;
};

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
