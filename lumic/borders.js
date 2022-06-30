export function drawPageBorder(margin) {
    rectMode(CORNERS);
    const hw = width * 0.5;
    const hh = height * 0.5;
    rect(
        -hw + margin,
        -hh + margin,
        hw - margin,
        hh - margin
    );
}