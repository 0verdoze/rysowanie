

/**
 * 2D vector, used for storing mouse coordinates.
 */
class Vector2 {
    public x: number;
    public y: number;

    /**
     * Creates a new Vector2 instance.
     * @param x - The x-coordinate of the vector.
     * @param y - The y-coordinate of the vector.
     */
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /**
     * Adds another vector to this vector and returns the result as a new Vector2 instance.
     * @param rhs - The vector to add.
     * @returns The sum of this vector and the given vector.
     */
    public add(rhs: Vector2): Vector2 {
        return new Vector2(this.x + rhs.x, this.y + rhs.y);
    }

    /**
     * Subtracts another vector from this vector and returns the result as a new Vector2 instance.
     * @param rhs - The vector to subtract.
     * @returns The difference between this vector and the given vector.
     */
    public sub(rhs: Vector2): Vector2 {
        return new Vector2(this.x - rhs.x, this.y - rhs.y);
    }

    public toString(): string {
        return `(${round2(this.x)},${round2(this.y)})`;
    }
}

/**
 * 3D vector, used to store color information.
 */
class Vector3 {
    public x: number;
    public y: number;
    public z: number;

    /**
     * Creates a new Vector3 instance.
     * @param x - The x component of the vector.
     * @param y - The y component of the vector.
     * @param z - The z component of the vector.
     */
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Returns a string representation of the vector.
     * @returns A string representation of the vector in the format "(x,y,z)".
     */
    public toString(): string {
        return `(${round2(this.x)},${round2(this.y)},${round2(this.z)})`
    }

    /**
     * Converts a decimal number to its hexadecimal representation.
     * @param dec - The decimal number to convert.
     * @returns The hexadecimal representation of the decimal number.
     */
    static decToHex(dec: number): string {
        return dec.toString(16);
    }
        
    /**
     * Pads a string with leading zeros to ensure it has at least two characters.
     * @param str - The string to pad.
     * @returns The padded string.
     */
    static padToTwo(str: string): string {
        return str.padStart(2, '0');
    }

    /**
     * Converts the vector to its hexadecimal color representation.
     * @returns The hexadecimal color representation of the vector in the format "#RRGGBB".
     */
    public toHex(): string {
        const hexR = Vector3.padToTwo(Vector3.decToHex(this.x));
        const hexG = Vector3.padToTwo(Vector3.decToHex(this.y));
        const hexB = Vector3.padToTwo(Vector3.decToHex(this.z));
        
        return `#${hexR}${hexG}${hexB}`;
    }

    /**
     * Calculates the square difference between this vector and another vector.
     * @param rhs - The vector to calculate the square difference with.
     * @returns The square difference between the two vectors.
     */
    public squareDiff(rhs: Vector3): number {
        return (this.x - rhs.x) * (this.x - rhs.x)
             + (this.y - rhs.y) * (this.y - rhs.y)
             + (this.z - rhs.z) * (this.z - rhs.z);
    }

    /**
     * A dictionary of octave colors represented as Vector3 instances.
     */
    static octaveColors: any = {
        "w": new Vector3(255, 255, 255),
        "k": new Vector3(0, 0, 0),
        "r": new Vector3(212, 0, 0),
        "g": new Vector3(0, 212, 0),
        "b": new Vector3(0, 0, 212),
        "y": new Vector3(212, 212, 0),
        "m": new Vector3(212, 0, 212),
        "c": new Vector3(0, 212, 212),
    };

    /**
     * Converts the vector to its nearest octave color representation, as its not natural for human to type in RGB values.
     * @returns The nearest octave color representation of the vector.
     */
    public toOctaveColor(): string {
        let distance = Infinity;
        let color: string = "k";

        for (const key in Vector3.octaveColors) {
            const value = Vector3.octaveColors[key];
            let diff = this.squareDiff(value);

            if (diff < distance) {
                color = key;
                distance = diff;
            }
        }

        return color;
    }
}

/**
 * Represents cursor selection/drawn shape type
 */
enum Shape {
    Rectangle = "rectangle",
    Circle = "circle",
    Polygon = "polygon",
    Custom = "custom",
    Line = "line",
}

/**
 * Represents the data for drawing a shape on a canvas.
 */
class DrawData {
    public shape: Shape;
    public startPos: Vector2;
    public extraData: Vector2[];
    public fill: boolean;
    public color: Vector3;
    public brushSize: number;
    public hover: boolean;

    constructor(
        shape: Shape,
        startPos: Vector2,
        extraData: Vector2[],
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ) {
        this.shape = shape;
        this.startPos = startPos;
        this.extraData = extraData;
        this.fill = fill;
        this.color = new Vector3(color.x, color.y, color.z);
        this.brushSize = brushSize;
        this.hover = false;
    }

    /**
     * Creates a new instance with Rectangle shape.
     * 
     * @param start - The starting position of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @param fill - Indicates whether the rectangle should be filled or not.
     * @param color - The color of the rectangle.
     * @param brushSize - The size of the brush used to draw the rectangle.
     * @returns A new DrawData object representing the Rectangle shape.
     */
    static new_rectangle(
        start: Vector2, 
        w: number,
        h: number,
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        return new DrawData(Shape.Rectangle, start, [new Vector2(w, h)], fill, color, brushSize);
    }

    /**
     * Creates a new instance with Perfect Circle (not an ellipse) shape.
     * 
     * @param start - The starting position of the circle.
     * @param radius - The radius of the circle.
     * @param fill - A boolean indicating whether the circle should be filled.
     * @param color - The color of the circle.
     * @param brushSize - The size of the brush used to draw the circle.
     * @returns A new DrawData object representing the Circle shape.
     */
    static new_perfect_circle(
        start: Vector2,
        radius: number,
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        return DrawData.new_circle(start, new Vector2(radius, radius), fill, color, brushSize);
    }

    /**
     * Creates a new instance with Circle (maybe ellipse) shape.
     * 
     * @param start - The starting position of the circle.
     * @param radius - The radius of the circle.
     * @param fill - A boolean indicating whether the circle should be filled or not.
     * @param color - The color of the circle.
     * @param brushSize - The size of the brush used to draw the circle.
     * @returns A new DrawData object representing the Circle shape.
     */
    static new_circle(
        start: Vector2,
        radius: Vector2,
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        return new DrawData(Shape.Circle, start, [radius], fill, color, brushSize);
    }

    /**
     * Creates a new instance with Polygon shape.
     * 
     * @param start - The starting position of the polygon.
     * @param radius - The radius of the polygon.
     * @param polygons - The number of polygons.
     * @param fill - A boolean indicating whether the polygon should be filled.
     * @param color - The color of the polygon.
     * @param brushSize - The size of the brush.
     * @returns A new DrawData object representing the polygon shape.
     */
    static new_polygon(
        start: Vector2,
        radius: Vector2,
        polygons: number,
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        // TODO: add rotation offset
        return new DrawData(Shape.Polygon, start, [radius, polygons as unknown as Vector2], fill, color, brushSize);
    }

    /**
     * Creates a new instance with Custom shape.
     * @param start - The starting position of the shape.
     * @param points - An array of points that define the shape.
     * @param fill - A boolean indicating whether the shape should be filled.
     * @param color - The color of the shape.
     * @param brushSize - The size of the brush used to draw the shape.
     * @returns A new DrawData object representing the Custom shape.
     */
    static new_custom(
        start: Vector2,
        points: Vector2[],
        fill: boolean,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        return new DrawData(Shape.Custom, start, points, fill, color, brushSize);
    }

    /**
     * Creates a new DrawData object representing a line.
     * 
     * @param start - The starting point of the line.
     * @param end - The ending point of the line.
     * @param color - The color of the line.
     * @param brushSize - The size of the brush used to draw the line.
     * @returns A new DrawData object representing a line.
     */
    static new_line(
        start: Vector2,
        end: Vector2,
        color: Vector3,
        brushSize: number,
    ): DrawData {
        return new DrawData(Shape.Line, start, [end], false, color, brushSize);
    }

    public toString(): string {
        return `${this.startPos} ${this.extraData}`
    }

    /**
     * Converts the shape to Octave code.
     * @param canvas_y The y-coordinate of the canvas.
     * @returns The Octave code representing the shape.
     */
    public toOctaveCode(canvas_y: number): string {
        // plot - linia
        // fill - fill
        let x: string;
        let y: string;

        let points = this.toPoints();
        if (points !== null) {
            x = y = "[ ";

            points.forEach(point => {
                x += `${point.x} `
                y += `${canvas_y - point.y} `
            });

            x += `]`
            y += `]`
        } else {
            let polygons = 360;
            let radius = this.extraData[0];

            if (this.shape === Shape.Polygon) {
                polygons = this.extraData[1] as unknown as number;
            }

            x = `${this.startPos.x} + ${Math.round(radius.x)} * cosd(0:360/${polygons}:360)`
            y = `${canvas_y - this.startPos.y} + ${Math.round(radius.y)} * sind(0:360/${polygons}:360)`
        }

        return `x = ${x};\ny = ${y};\n${this.fill ? "fill" : "plot"}(x, y, '${this.color.toOctaveColor()}');\n\n`;
    }

    private toPoints(): Vector2[]|null {
        switch (this.shape) {
            case Shape.Line: {
                return [this.startPos, ...this.extraData];
            }
            case Shape.Custom: {
                return [this.startPos, ...this.extraData, this.startPos];
            }
            case Shape.Rectangle:
            {
                let offset = this.extraData[0];

                return [
                    this.startPos,
                    this.startPos.add(new Vector2(offset.x, 0)),
                    this.startPos.add(new Vector2(offset.x, offset.y)),
                    this.startPos.add(new Vector2(0, offset.y)),
                    this.startPos,
                ];
            }
            default: { return null; }
        }
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100
}
