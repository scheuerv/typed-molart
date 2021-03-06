import * as blender from "color-blend";
import ColorConvert from "color-convert";
import { RGB } from "color-convert/conversions";
import { TrackFragment } from "uniprot-nightingale/src/types/accession";

export function mixFragmentColors(fragments: TrackFragment[]): TrackFragment[] {
    const mixedColorFragments: TrackFragment[] = [];
    if (fragments.length > 0) {
        const sortedFragments = fragments.sort((a, b) => {
            return a.sequenceStart - b.sequenceStart;
        });
        let lastStart: number = sortedFragments[0].sequenceStart;
        let [openedFragments, nextId] = getStartsWith(lastStart, sortedFragments);
        while (nextId < sortedFragments.length || openedFragments.length > 0) {
            const nearestEnd = getNearestEnd(openedFragments);
            const nearestStart = sortedFragments[nextId]?.sequenceStart
                ? sortedFragments[nextId]?.sequenceStart - 1
                : nearestEnd;
            if (nearestEnd < nearestStart) {
                mixedColorFragments.push({
                    sequenceStart: lastStart,
                    sequenceEnd: nearestEnd,
                    color: mixColor(openedFragments)
                });
                openedFragments = openedFragments.filter(
                    (fragment) => fragment.sequenceEnd != nearestEnd
                );
                lastStart = nearestEnd + 1;
            } else if (nearestEnd > nearestStart) {
                mixedColorFragments.push({
                    sequenceStart: lastStart,
                    sequenceEnd: nearestStart,
                    color: mixColor(openedFragments)
                });
                let newFragments: TrackFragment[];
                [newFragments, nextId] = getStartsWith(nearestStart + 1, sortedFragments);
                openedFragments = openedFragments.concat(newFragments);
                lastStart = nearestStart + 1;
            } else {
                mixedColorFragments.push({
                    sequenceStart: lastStart,
                    sequenceEnd: nearestStart,
                    color: mixColor(openedFragments)
                });
                let newFragments: TrackFragment[];
                [newFragments, nextId] = getStartsWith(nearestStart + 1, sortedFragments);
                openedFragments = openedFragments.concat(newFragments);
                openedFragments = openedFragments.filter(
                    (fragment) => fragment.sequenceEnd != nearestEnd
                );
                lastStart = nearestStart + 1;
            }
            if (openedFragments.length == 0 && nextId < sortedFragments.length) {
                lastStart = sortedFragments[nextId].sequenceStart;
                let newFragments: TrackFragment[];
                [newFragments, nextId] = getStartsWith(lastStart, sortedFragments);
                openedFragments = openedFragments.concat(newFragments);
                if (nextId == sortedFragments.length && openedFragments.length != 0) {
                    while (openedFragments.length != 0) {
                        const nearestEnd = getNearestEnd(openedFragments);
                        mixedColorFragments.push({
                            sequenceStart: lastStart,
                            sequenceEnd: nearestEnd,
                            color: mixColor(openedFragments)
                        });
                        openedFragments = openedFragments.filter(
                            (fragment) => fragment.sequenceEnd != nearestEnd
                        );
                        lastStart = nearestEnd + 1;
                    }
                }
            }
        }
    }
    return mixedColorFragments;
}

function getStartsWith(start: number, sortedFragments: TrackFragment[]): [TrackFragment[], number] {
    const newFragments: TrackFragment[] = [];
    for (let i = 0; i < sortedFragments.length; i++) {
        const fragment = sortedFragments[i];
        if (fragment.sequenceStart == start) {
            newFragments.push(fragment);
        } else if (fragment.sequenceStart > start) {
            return [newFragments, i];
        }
    }
    return [newFragments, sortedFragments.length];
}

function getNearestEnd(openedFragments: TrackFragment[]): number {
    if (openedFragments.length == 0) {
        throw new Error("At least one fragment required");
    }
    let minEnd: number = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < openedFragments.length; i++) {
        const fragment: TrackFragment = openedFragments[i];
        if (fragment.sequenceEnd < minEnd) {
            minEnd = fragment.sequenceEnd;
        }
    }
    return minEnd;
}

function mixColor(openedFragments: TrackFragment[]): string {
    if (openedFragments.length == 0) {
        throw new Error("At least one fragment required");
    }
    const color: RGB = ColorConvert.hex.rgb(openedFragments[0].color);
    let rgbaColor = { a: 0.5, r: color[0], g: color[1], b: color[2] };
    for (let i = 1; i < openedFragments.length; i++) {
        const nextColor: RGB = ColorConvert.hex.rgb(openedFragments[i].color);
        rgbaColor = blender.darken(rgbaColor, {
            a: 0.5,
            r: nextColor[0],
            g: nextColor[1],
            b: nextColor[2]
        });
    }
    return "#" + ColorConvert.rgb.hex([rgbaColor.r, rgbaColor.g, rgbaColor.b]);
}
