export const greenTheme = {
    colors : ["#F2F2F2", "#C6E070", "#91C46C", "#287D7D", "#1C344C"]
} ;

export const cyberpunkTheme = {
    colors: ["#F20587", "#8416F2", "#5C82F2"]
};

export function getColor(palette, i) {
    return palette.colors[i % palette.colors.length];
}

export function getRandomColor(palette) {
    const r = Math.floor(random(palette.colors.length));
    return palette.colors[r];
}