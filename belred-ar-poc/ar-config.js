import { data as aData, data} from './A-data/hex.js'
// import { data as bData } from './B-data/hex.js'
import { data as cData } from './C-data/hex.js'
// import { data as dData } from './D-data/hex.js'

export const config = {
    "A" : {
        data: aData,
        bgId: "A-bg",
        patternId: "A-pattern",
        marginId: "A-margin",
    },
    // "B" : {
    //     data: bData,
    //     bgId: "B-bg",
    //     patternId: "B-pattern",
    //     marginId: "B-margin",
    // },
    "C" : {
        data: cData,
        bgId: "C-bg",
        patternId: "C-pattern",
        marginId: "C-margin",
    },
    // "D" : {
    //     data: dData,
    //     bgId: "D-bg",
    //     patternId: "D-pattern",
    //     marginId: "D-margin",
    // },
}