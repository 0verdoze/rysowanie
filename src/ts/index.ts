/// <reference path="./types.ts" />

// global constant references to http elemenets
const canvas = document.querySelector("canvas")!,
    toolBtns = document.querySelectorAll(".tool")!,
    fillColor: HTMLInputElement = document.querySelector("#fill-color")!,
    perfectCircle: HTMLInputElement = document.querySelector("#perfect-circle")!,
    enableGrid: HTMLInputElement = document.querySelector("#enable-grid")!,
    gridSize: HTMLInputElement = document.querySelector("#grid-size")!,
    sizeSlider: HTMLInputElement = document.querySelector("#size-slider")!,
    colorBtns = document.querySelectorAll(".colors .option")!,
    colorPicker: HTMLInputElement = document.querySelector("#color-picker")!,
    middleDraw: HTMLInputElement = document.querySelector("#middle-draw")!,
    ctx = canvas!.getContext("2d", { "willReadFrequently": true })!,
    drawHistoryList: HTMLUListElement = document.querySelector("#history-list")!,
    polygonCount: HTMLInputElement = document.querySelector("#polygon-count")!,
    copyCodeBtn: HTMLButtonElement = document.querySelector("#copy-code")!;

/**
 * used to parse css color ex. rgb(255, 255, 255)
*/
const MATCH_COLOR = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/;

/**
 * used to parse hex color
*/
const MATCH_COLOR_HEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i

/**
 * all drawn elements by the user
 */
let drawHistory: DrawData[] = [];

/**
 * currently selected color by the user
 */
let selectedColorRGB: Vector3 = new Vector3(0, 0, 0);

// global variables with default values
let prevMouse = new Vector2(0, 0),
    snapshot: ImageData,
    isDrawing = false,
    isPushed = false,
    isHistorySizeSet = false,
    selectedTool = Shape.Rectangle,
    brushWidth = 5;

/**
 * helper function to draw rectangle
 * @param e MouseEvent
 * @returns drawn element
 */
function drawRect(e: MouseEvent): DrawData {
    let currPos = mousePos(e);
    let start, w, h;

    if (middleDraw.checked) {
        start = prevMouse.add(prevMouse.sub(currPos));

        w = currPos.x - start.x;
        h = currPos.y - start.y;
    } else {
        start = prevMouse;

        w = currPos.x - prevMouse.x;
        h = currPos.y - prevMouse.y;
    }

    return DrawData.new_rectangle(start, w, h, fillColor.checked, selectedColorRGB, brushWidth);
}

/**
 * Draws a circle based on the mouse event.
 * 
 * @param e - The mouse event.
 * @returns The draw data for the circle.
 */
function drawCircle(e: MouseEvent): DrawData {
    let centerX: number;
    let centerY: number;

    let curPos = mousePos(e);

    if (middleDraw.checked) {
        centerX = prevMouse.x
        centerY = prevMouse.y
    } else {
        centerX = prevMouse.x - (prevMouse.x - curPos.x) / 2;
        centerY = prevMouse.y - (prevMouse.y - curPos.y) / 2;
    }

    let start = new Vector2(centerX, centerY);
    let fill = fillColor.checked;

    if (perfectCircle.checked) {
        let radius = Math.sqrt(Math.pow((prevMouse.x - curPos.x), 2) + Math.pow((prevMouse.y - curPos.y), 2));

        if (!middleDraw.checked) {
            radius /= 2;
        }

        return DrawData.new_perfect_circle(start, radius, fill, selectedColorRGB, brushWidth);
    } else {
        let radiusX = Math.abs((centerX - curPos.x) * Math.sqrt(2));
        let radiusY = Math.abs((centerY - curPos.y) * Math.sqrt(2));

        return DrawData.new_circle(start, new Vector2(radiusX, radiusY), fill, selectedColorRGB, brushWidth);
    }
}

/**
 * helper function to draw single line
 * @param e MouseEvent
 * @returns drawn element
 */
function drawLine(e: MouseEvent): DrawData {
    let currPos = mousePos(e);
    let start;

    if (middleDraw.checked) {
        start = prevMouse.add(prevMouse.sub(currPos));
    } else {
        start = prevMouse;
    }

    return DrawData.new_line(start, currPos, selectedColorRGB, brushWidth);
}

/**
 * helper function to draw polygon
 * @param e MouseEvent
 * @returns drawn element
 */
function drawPolygon(e: MouseEvent): DrawData {
    let centerX: number;
    let centerY: number;

    let curPos = mousePos(e);

    if (middleDraw.checked) {
        centerX = prevMouse.x
        centerY = prevMouse.y
    } else {
        centerX = prevMouse.x - (prevMouse.x - curPos.x) / 2;
        centerY = prevMouse.y - (prevMouse.y - curPos.y) / 2;
    }

    let fill = fillColor.checked;
    let start = new Vector2(centerX, centerY);
    let radius = new Vector2(0, 0);

    if (perfectCircle.checked) {
        let radiusFlat = Math.sqrt(Math.pow((prevMouse.x - curPos.x), 2) + Math.pow((prevMouse.y - curPos.y), 2));

        if (!middleDraw.checked) {
            radiusFlat /= 2;
        }

        radius.x = radius.y = radiusFlat;
    } else {
        radius.x = Math.abs((centerX - curPos.x) * Math.sqrt(2));
        radius.y = Math.abs((centerY - curPos.y) * Math.sqrt(2));
    }

    return DrawData.new_polygon(start, radius, polygonCount.valueAsNumber, fill, selectedColorRGB, brushWidth);
}

/**
 * helper function to draw shape out of lines
 * @param e MouseEvent
 * @param drawData previously drawn shape (in reality this function appends new point to `extraData`)
 * @returns drawn element
 */
function drawCustom(e: MouseEvent, drawData: DrawData): DrawData {
    drawData.extraData[drawData.extraData.length - 1] = mousePos(e);
    
    return drawData;
}

/**
 * helper function to draw triangle
 * @param e MouseEvent
 * @returns drawn element
 */
function drawTriangle(e: any) {
    ctx.beginPath(); // creating new path to draw circle
    ctx.moveTo(prevMouse.x, prevMouse.y); // moving triangle to the mouse pointer
    ctx.lineTo(e.offsetX, e.offsetY); // creating first line according to the mouse pointer
    ctx.lineTo(prevMouse.x * 2 - e.offsetX, e.offsetY); // creating bottom line of triangle
    ctx.closePath(); // closing path of a triangle so the third line draw automatically
    fillColor.checked ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill triangle else draw border
}


/**
 * called uppon `mousedown` event
 * @param e MouseEvent
 * @returns 
 */
function startDraw(e: MouseEvent) {
    // Shape.Custom needs special treatment
    if (selectedTool === Shape.Custom) {
        if (!isDrawing) {
            isDrawing = true;
            isPushed = true;

            drawHistory.push(DrawData.new_custom(
                mousePos(e),
                [mousePos(e)],
                fillColor.checked,
                selectedColorRGB,
                brushWidth,
            ))
        } else {
            drawHistory[drawHistory.length - 1].extraData.push(mousePos(e));
        }
        
        return;
    }

    isDrawing = true;
    isPushed = false;

    prevMouse = mousePos(e);
}

/**
 * called uppon `mousemove` event
 * @param e MouseEvent
 * @returns 
 */
function drawing(e: MouseEvent) {
    if (snapshot == null) {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

    if (!isDrawing) {
        // draw cursor and return early
        drawShape(DrawData.new_perfect_circle(
            mousePos(e),
            brushWidth / 2,
            true,
            selectedColorRGB,
            0
        ));

        return;
    } 

    let drawData: DrawData;
    if (selectedTool === Shape.Rectangle) {
        drawData = drawRect(e);
    } else if (selectedTool === Shape.Circle) {
        drawData = drawCircle(e);
    } else if (selectedTool === Shape.Polygon) {
        drawData = drawPolygon(e);
    } else if (selectedTool === Shape.Custom) {
        drawData = drawCustom(e, drawHistory[drawHistory.length - 1]);
    } else if (selectedTool === Shape.Line) {
        drawData = drawLine(e);
    } else {
        return;
    }

    if (!isPushed) {
        drawHistory.push(drawData);
        isPushed = true;
    } else {
        drawHistory[drawHistory.length - 1] = drawData
    }

    drawShape(drawData);
}

/**
 * Handles the end of a drawing event.
 * 
 * @param {MouseEvent} _ - The mouse event object.
 * @returns {void}
 */
function endDraw(_: MouseEvent) {
    // Shape.Custom needs special treatment, as shape is not finished until Enter is pressed
    if (selectedTool === Shape.Custom && isPushed == true) {
        return;
    }

    let wasDrawing = isDrawing;
    isDrawing = false;

    if (isPushed == false || wasDrawing == false) {
        if (wasDrawing == false) {
            drawHistory.pop();
        }
        
        return;
    }

    // set history size div to max height of canvas
    if (!isHistorySizeSet) {
        isHistorySizeSet = true;
        drawHistoryList.style.maxHeight = `${canvas.height - 22}px`;
    }

    // save drawn element to history list
    if (isPushed) {
        const shape = drawHistory[drawHistory.length - 1];
        
        const node = document.createElement("div");
        const icon = document.createElement("img");
        const fill = document.createElement("input");
        const eraser = document.createElement("img");
        const colorContainer = document.createElement("div");
        const color = document.createElement("input");
        const up = document.createElement("img");
        const down = document.createElement("img");
        // const text = document.createElement("div");

        node.classList.add("colors");

        icon.setAttribute("src", `icons/${shape.shape}.svg`)
        fill.setAttribute("type", "checkbox");
        fill.checked = shape.fill;

        eraser.setAttribute("src", "icons/eraser.svg");
        eraser.style.cursor = "pointer";

        colorContainer.appendChild(color);
        color.type = "color";
        color.classList.add("history-color-picker");
        color.value = selectedColorRGB.toHex();

        up.setAttribute("src", "icons/up.svg");
        down.setAttribute("src", "icons/down.svg");
        up.classList.add("arrow");
        down.classList.add("arrow");

        up.onclick = (e) => { move_by((e.target! as HTMLElement).parentNode as HTMLDivElement, -1); redraw(); };
        down.onclick = (e) => { move_by((e.target! as HTMLElement).parentNode as HTMLDivElement, 1); redraw(); };
        eraser.onclick = (e) => { pop(find((e.target! as HTMLElement).parentNode as HTMLDivElement)); redraw() };

        fill.onchange = (e) => {
            let checked = (e.currentTarget! as HTMLInputElement);
            let node = (e.target! as HTMLElement).parentNode as HTMLDivElement;

            drawHistory[find(node)].fill = checked.checked;

            redraw();
        };

        color.oninput = (e) => {
            let color: HTMLInputElement = e.target! as HTMLInputElement;
            let parent = (e.target as any).parentNode.parentNode as HTMLDivElement;

            let result = MATCH_COLOR_HEX.exec(color.value)!;

            let drawData = drawHistory[find(parent)];
            
            drawData.color.x = Number.parseInt(result[1], 16)!;
            drawData.color.y = Number.parseInt(result[2], 16)!;
            drawData.color.z = Number.parseInt(result[3], 16)!;

            redraw();
        };

        node.onmouseenter = (e) => {
            let idx = find(e.target! as HTMLDivElement);
            drawHistory[idx].hover = true;

            redraw();
        };

        node.onmouseleave = (e) => {
            let idx = find(e.target! as HTMLDivElement);
            drawHistory[idx].hover = false;

            redraw();
        };

        node.appendChild(eraser);
        node.appendChild(icon);
        node.appendChild(fill);
        node.appendChild(colorContainer);
        node.appendChild(up);
        node.appendChild(down);

        drawHistoryList.appendChild(node);
        isPushed = false;
    }

    redraw();
}


/**
 * Handles the finishing logic for custom shape drawing
 * @param e - The keyboard event.
 */
function finishCustom(e: KeyboardEvent) {
    if (e.key === "Enter" && isDrawing && selectedTool === Shape.Custom) {
        // pop currently viewed line
        drawHistory[drawHistory.length - 1].extraData.pop();

        // we will reuse endDraw logic, with use of spaghetti, i dont have time to extract logic
        selectedTool = Shape.Line;
        endDraw(null as unknown as MouseEvent);
        selectedTool = Shape.Custom;
    }
}

/**
 * Cancels the current drawing operation and restores the canvas to the previous state.
 * @param {MouseEvent} _ - The mouse event object (not used in this function).
 * @returns {boolean} - Returns `false` to prevent default behavior.
 */
function cancelDraw(_: MouseEvent): boolean {
    // restore snapshot
    ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

    if (isDrawing && isPushed) {
        drawHistory.pop();
    }

    isDrawing = false;
    isPushed = false;

    return false;
}

/**
 * Returns the index of the given element in the draw history list.
 * 
 * @param e - The element to find.
 * @returns The index of the element in the draw history list.
 */
function find(e: HTMLDivElement): number {
    for (let i = 0; i < drawHistory.length; i++) {
        if (drawHistoryList.children[i] === e) {
            return i;
        }
    }

    throw null;
}

/**
 * Removes an element from the draw history list and returns the removed element along with its associated draw data.
 * 
 * @param i - The index of the element to remove.
 * @returns A tuple containing the removed HTMLDivElement and its associated DrawData.
 */
function pop(i: number): [HTMLDivElement, DrawData] {
    const node = drawHistoryList.children[i] as HTMLDivElement;
    const drawData = drawHistory[i];
    
    drawHistoryList.removeChild(node);
    drawHistory.splice(i, 1);

    return [node, drawData];
}

function setCanvasBackground() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Clears the canvas, sets the background, and redraws all shapes from the draw history.
 * Also takes a snapshot of the canvas.
 */
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clearing whole canvas
    setCanvasBackground();

    drawHistory.forEach(drawShape);
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Inserts the given data into the drawHistory array at the specified index.
 * Also appends or inserts the corresponding HTMLDivElement into the drawHistoryList.
 *
 * @param data - The data to be inserted, consisting of an HTMLDivElement and DrawData.
 * @param i - The index at which the data should be inserted.
 */
function push(data: [HTMLDivElement, DrawData], i: number) {
    drawHistory.splice(i, 0, data[1]);

    if (drawHistoryList.children.length <= i) {
        drawHistoryList.appendChild(data[0]);
    } else {
        drawHistoryList.insertBefore(data[0], drawHistoryList.children[i]);
    }
}

/**
 * Moves the HTMLDivElement by the specified offset.
 * 
 * @param {HTMLDivElement} e - The HTMLDivElement to move.
 * @param {number} offset - The offset to move by.
 */
function move_by(e: HTMLDivElement, offset: number) {
    let pos = find(e);
    let target_pos = pos + offset;

    if (target_pos >= 0 && target_pos < drawHistory.length) {
        move(pos, target_pos);
    }
}

/**
 * Moves drawn element inside the drawHistory array, from source to target index.
 * This effectivly the changes draw order when redrawing.
 * 
 * @param source - The source index.
 * @param target - The target index.
 */
function move(source: number, target: number) {
    let node = pop(source);

    push(node, target);
}

/**
 * Returns position of the mouse cursor, when grid is enabled it will snap to the grid.
 * @param e - The MouseEvent object containing information about the mouse event.
 * @returns Vector2 - position of the mouse cursor
 */
function mousePos(e: MouseEvent): Vector2 {
    let pos = new Vector2(e.offsetX, e.offsetY);

    if (enableGrid.checked && !e.shiftKey) {
        let grid = gridSize.valueAsNumber - 1;

        let gridX = Math.round(canvas.width / grid);
        let gridY = Math.round(canvas.height / grid);

        pos.x = Math.round(pos.x / gridX) * gridX;
        pos.y = Math.round(pos.y / gridY) * gridY;
    }

    return pos;
}

/**
 * Draws a shape based on the given data.
 * 
 * @param data - Data containing all information needed to draw the shape.
 */
function drawShape(data: DrawData) {
    let rgb;

    // if user is hovering over this node in history list, we will change color to be more visible
    if (data.hover) {
        rgb = `rgb(${127 - Math.trunc(data.color.x / 2)}, ${127 - Math.trunc(data.color.y / 2)}, ${127 - Math.trunc(data.color.z / 2)})`
    } else {
        rgb = `rgb(${data.color.x}, ${data.color.y}, ${data.color.z})`
    }

    ctx.strokeStyle = rgb;
    ctx.fillStyle = rgb;

    ctx.lineWidth = data.brushSize;
    ctx.beginPath();

    switch (data.shape) {
    default:{}
    break; case Shape.Circle: {
        ctx.ellipse(data.startPos.x, data.startPos.y, data.extraData[0].x, data.extraData[0].y, 0, 2 * Math.PI, 0)
        data.fill ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill circle else draw border circle
    }
    break; case Shape.Rectangle: {
        if(!data.fill) {
            ctx.strokeRect(data.startPos.x, data.startPos.y, data.extraData[0].x, data.extraData[0].y);
        } else {
            ctx.fillRect(data.startPos.x, data.startPos.y, data.extraData[0].x, data.extraData[0].y);
        }
    }
    break; case Shape.Polygon: {
        let middlePos = data.startPos;
        let radius = data.extraData[0];
        let polygonCount = data.extraData[1] as unknown as number;

        let step = (2 * Math.PI) / polygonCount;
        for (let i = 0; i < polygonCount; i++) {
            let x = middlePos.x + radius.x * Math.cos(step * i);
            let y = middlePos.y + radius.y * Math.sin(step * i) * -1;

            if (i == 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        data.fill ? ctx.fill() : ctx.stroke();
    }
    break; case Shape.Custom: {
        let startPos = data.startPos;
        ctx.moveTo(startPos.x, startPos.y);

        data.extraData.forEach(pos => {
            ctx.lineTo(pos.x, pos.y);
        });

        ctx.closePath();
        data.fill ? ctx.fill() : ctx.stroke();
    }
    break; case Shape.Line: {
        let endPos = data.extraData[0];

        ctx.moveTo(data.startPos.x, data.startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        // ctx.closePath();

        ctx.stroke();
    }
    }
}

// adding click event to all tool option
toolBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all tool option
        // removing active class from the previous option and adding on current clicked option
        document.querySelector(".options .active")!.classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id as Shape;
    });
});

sizeSlider.addEventListener("change", () => brushWidth = sizeSlider.valueAsNumber); // passing slider value as brushSize

// adding click event to all color button (color picker)
colorBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all color button
        // removing selected class from the previous option and adding on current clicked option
        document.querySelector(".options .selected")!.classList.remove("selected");
        btn.classList.add("selected");
        // passing selected btn background color as selectedColor value
        let selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
        // color.x = selectedColor
        let result = MATCH_COLOR.exec(selectedColor)!;

        selectedColorRGB.x = Number.parseInt(result[1])!;
        selectedColorRGB.y = Number.parseInt(result[2])!;
        selectedColorRGB.z = Number.parseInt(result[3])!;
    });
});

// adding change event to color picker
colorPicker.addEventListener("change", () => {
    // passing picked color value from color picker to last color btn background
    colorPicker.parentElement!.style.background = colorPicker.value;
    colorPicker.parentElement!.click();
});

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", endDraw);
document.onkeydown = finishCustom;
canvas.oncontextmenu = cancelDraw;

window.addEventListener("load", () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    setCanvasBackground();
});

// generate octave code
copyCodeBtn.onclick = (_: MouseEvent) => {
    let code = "hold on\naxis equal\n";
    let canvas_y_max = canvas.height;

    drawHistory.forEach(drawData => {
        code += drawData.toOctaveCode(canvas_y_max);
    });

    navigator.clipboard.writeText(code);
};
