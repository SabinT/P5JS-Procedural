export const greenTheme = {
    count : 5,
    colors : ["#F2F2F2", "#C6E070", "#91C46C", "#287D7D", "#1C344C"]
} ;

export function getColor(palette, i) {
    return palette.colors[i % palette.count];
}