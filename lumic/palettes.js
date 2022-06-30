import { mod } from "./common.js";

export const greenTheme = {
    colors : ["#F2F2F2", "#C6E070", "#91C46C", "#287D7D", "#1C344C"],
    bgcolors: ["#000000"]
};

export const galaxyTheme = {
    colors: ["#F220FA", "#7200E0", "#B400F5", "#E6006D", "#0079FA"],
    bgcolors: ["#5B187D", "#661848"]
};

export const bwTheme = {
    colors : ["#FFFFFF"],
    bgcolors: ["#000000"]
};

export const whiteNoFillTheme = {
    colors : ["#FFFFFF"],
    bgcolors: ["#00000000"]
};

export const cyberpunkTheme = {
    colors: ["#F20587", "#8416F2", "#5C82F2"],
    bgcolors: ["#4d0033"]
};

export const cloverTheme = {
    colors: ["#034001", "#2E8C03", "#267302", "#62BF04"],
    bgcolors: ["#022601", "#034001"]
};

export function getColor(palette, i) {
    return palette.colors[mod(i, palette.colors.length)];
}

export function getRandomColor(palette) {
    const r = Math.floor(random(palette.colors.length));
    return palette.colors[r];
}