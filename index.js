let VSHADER_SOURCE = [
    'attribute vec4 a_Position;',
    'attribute vec4 a_Color;',
    'attribute vec4 a_Normal;',
    'attribute vec2 a_TexCoords;',
    'uniform mat4 u_ProjMatrix;',
    'uniform mat4 u_ViewMatrix;',
    'uniform mat4 u_ModelMatrix;',
    'uniform mat4 u_NormalMatrix;',
    'varying vec4 v_Color;',
    'varying vec3 v_Normal;',
    'varying vec2 v_TexCoords;',
    'varying vec3 v_Position;',
    'void main() {',
    '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;',
    '  v_Position = vec3(u_ModelMatrix * a_Position);',
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));',
    '  v_Color = a_Color;',
    '  v_TexCoords = a_TexCoords;',
    '}'
].join('\n');

let FSHADER_SOURCE = [
    'precision mediump float;',
    'uniform bool u_UseTextures;',
    'uniform vec3 u_LightPosition[4];',
    'uniform vec3 u_LightColor[4];',
    'uniform vec3 u_AmbientLight;',
    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'varying vec4 v_Color;',
    'uniform sampler2D u_Sampler;',
    'varying vec2 v_TexCoords;',
    'void main() {',
    '  vec4 col = u_UseTextures ? texture2D(u_Sampler, v_TexCoords) : v_Color;',
    '  vec3 normal = normalize(v_Normal);',
    '  vec3 f_color = u_AmbientLight * col.rgb;',
    '  vec3 diffuse;',
    '  for (int i = 0; i < 3; i++) {',
    '       vec3 lightDirection = normalize(u_LightPosition[i] - v_Position);',
    '       float nDotL = max(dot(lightDirection, normal), 0.0);',
    '       diffuse = u_LightColor[i] * col.rgb * nDotL;',
    '       float distanceToLight = length(u_LightPosition[i] - v_Position);',
    '       float attenuation = 1.0 / (1.0 + 0.035 * pow(distanceToLight, 2.0));',
    '       f_color += attenuation * diffuse;',
    '   }',
    '   gl_FragColor = vec4(f_color, col.a);',
    '}'
].join('\n');

let chairs_move = 0.1;
let chairs_move_rate = 0.05;
let col_r = 0;
let col_g = 0;
let col_b = 0;
let col_r_rate = 20;
let col_g_rate = 0;
let col_b_rate = 0;
let col_r_value;
let col_g_value;
let col_b_value;
let speaker_move = 0;
let speaker_move_temp = 0.05
let mat_stack = [];
let lamp = false;
let chest = false;
let speaker = false;
let universal_light = true;
let textures = true;
let rot_x = 180;
let rot_y = 105;
let xAngle = 0.0;
let yAngle = 0.0;
let keys = [];
let x = 0;
let y = 5.5;
let z = 15;
let chairs = false;
let prev = 0;
let curr = 0;
let camera;

let modelMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let projMatrix = new Matrix4();
let normalMatrix = new Matrix4();

let u_ModelMatrix, u_ViewMatrix, u_NormalMatrix, u_ProjMatrix, u_LightColor,
    u_LightPosition, u_Sampler, u_AmbientLight, u_UseTextures;

let LIGHT_POSITIONS = [
    0, 2.5, -4, 3.8, 1, 3.5, 50, 50, 20
];

let LIGHT_COLORS = [
    0, 0, 0, 0, 0, 0, 1, 1, 1
];


function main() {
    let canvas = document.getElementById('room');
    camera = document.getElementById('camera');
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialise shaders.');
        return;
    }

    gl.clearColor(1, 0.8, 0.7, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    u_UseTextures = gl.getUniformLocation(gl.program, "u_UseTextures");
    gl.uniform1i(u_UseTextures, 0);

    let rugTexture = gl.createTexture();
    rugTexture.image = new Image();
    rugTexture.image.crossOrigin = "anonymous";
    rugTexture.image.src = './textures/rug.png';
    rugTexture.image.onload = function() {
        loadTexture(gl, rugTexture, gl.TEXTURE1);
    };

    let metalTexture = gl.createTexture();
    metalTexture.image = new Image();
    metalTexture.image.crossOrigin = "anonymous";
    metalTexture.image.src = './textures/furn.png';
    metalTexture.image.onload = function() {
        loadTexture(gl, metalTexture, gl.TEXTURE2);
    };

    let furnTexture = gl.createTexture();
    furnTexture.image = new Image();
    furnTexture.image.crossOrigin = "anonymous";
    furnTexture.image.src = './textures/seat.png';
    furnTexture.image.onload = function() {
        loadTexture(gl, furnTexture, gl.TEXTURE3);
    };

    let tableTexture = gl.createTexture();
    tableTexture.image = new Image();
    tableTexture.image.crossOrigin = "anonymous";
    tableTexture.image.src = './textures/table.png';
    tableTexture.image.onload = function() {
        loadTexture(gl, tableTexture, gl.TEXTURE4);
    };

    let wallTexture = gl.createTexture();
    wallTexture.image = new Image();
    wallTexture.image.crossOrigin = "anonymous";
    wallTexture.image.src = './textures/wall.png';
    wallTexture.image.onload = function() {
        loadTexture(gl, wallTexture, gl.TEXTURE5);
    };

    let floorTexture = gl.createTexture();
    floorTexture.image = new Image();
    floorTexture.image.crossOrigin = "anonymous";
    floorTexture.image.src = './textures/marble.png';
    floorTexture.image.onload = function() {
        loadTexture(gl, floorTexture, gl.TEXTURE6);
    };

    let ceilingTexture = gl.createTexture();
    ceilingTexture.image = new Image();
    ceilingTexture.image.crossOrigin = "anonymous";
    ceilingTexture.image.src = './textures/ceiling.png';
    ceilingTexture.image.onload = function() {
        loadTexture(gl, ceilingTexture, gl.TEXTURE7);
    };

    let speakerTexture = gl.createTexture();
    speakerTexture.image = new Image();
    speakerTexture.image.crossOrigin = "anonymous";
    speakerTexture.image.src = './textures/speaker.png';
    speakerTexture.image.onload = function() {
        loadTexture(gl, speakerTexture, gl.TEXTURE8);
    };

    let speakerTexture2 = gl.createTexture();
    speakerTexture2.image = new Image();
    speakerTexture2.image.crossOrigin = "anonymous";
    speakerTexture2.image.src = './textures/speaker2.png';
    speakerTexture2.image.onload = function() {
        loadTexture(gl, speakerTexture2, gl.TEXTURE9);
    };

    let chestTexture = gl.createTexture();
    chestTexture.image = new Image();
    chestTexture.image.crossOrigin = "anonymous";
    chestTexture.image.src = './textures/chest.png';
    chestTexture.image.onload = function() {
        loadTexture(gl, chestTexture, gl.TEXTURE10);
    };

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    u_UseTextures = gl.getUniformLocation(gl.program, "u_UseTextures");

    if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_ProjMatrix || !u_LightColor || !u_LightPosition) {
        console.log('Failed to Get the storage location');
        return;
    }

    projMatrix.setPerspective(50, 800 / 800, 1, 100);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    gl.uniform3f(u_AmbientLight, 0.8, 0.8, 0.8);

    window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "1":
                universal_light = !universal_light
                if (universal_light) {
                    gl.uniform3f(u_AmbientLight, 0.8, 0.8, 0.8);
                } else {
                    gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
                }
                break;
            case "2":
                lamp = !lamp;
                let r;
                let g;
                let b;
                if (lamp) {
                    r = 1;
                    g = 214 / 255;
                    b = 170 / 255;
                } else {
                    r = 0 / 255;
                    g = 0 / 255;
                    b = 0 / 255;
                }
                LIGHT_COLORS = [
                    r, g, b,
                    LIGHT_COLORS[3], LIGHT_COLORS[4], LIGHT_COLORS[5],
                    1, 1, 1
                ];
                break;
            case "3":
                chest = !chest;
                break;
            case "4":
                speaker = !speaker;
                break;
            case "5":
                chairs = !chairs;
                break;
            case "6":
                textures = !textures;
                break;
        }
        keys.push(event.key);
    });

    window.addEventListener("keyup", (event) => {
        keys.splice(keys.indexOf(event.key));
        chairs = false;
    });

    let action = function(now) {
        now *= 0.01;
        curr = now - prev;
        prev = now;

        if (chairs) {
            chairs_move += chairs_move_rate;
            if (chairs_move > 0.5) {
                chairs_move_rate = -0.05;
            } else if (chairs_move < 0.1) {
                chairs_move_rate = 0.05;
            }
        }

        if (speaker) {
            speaker_move += speaker_move_temp;
            if (speaker_move > 0.15) {
                speaker_move_temp = -0.05;
            } else if (speaker_move < 0) {
                speaker_move_temp = 0.05;
            }
        }

        if (chest) {
            col_r += col_r_rate;
            col_g += col_g_rate;
            col_b += col_b_rate;
            if (col_r > 181) {
                col_r_rate = -20;
                col_g_rate = 20;
                col_b_rate = 0;
            } else if (col_g > 181) {
                col_r_rate = 0;
                col_g_rate = -20;
                col_b_rate = 20;
            } else if (col_b > 181) {
                col_r_rate = 20;
                col_g_rate = 0;
                col_b_rate = -20;
            }
            col_r_value = col_r;
            col_g_value = col_g;
            col_b_value = col_b;

        } else {
            col_r_value = 0;
            col_g_value = 0;
            col_b_value = 0;
        }

        LIGHT_COLORS = [
            LIGHT_COLORS[0], LIGHT_COLORS[1], LIGHT_COLORS[2],
            col_r_value / 255, col_g_value / 255, col_b_value / 255,
            1, 1, 1
        ];

        let rot_rate = 0.1;
        let move_rate = 0.1;

        for (let key of keys) {
            switch (key) {
                case "w":
                    y += move_rate;
                    break;

                case "s":
                    y -= move_rate;
                    break;

                case "a":
                    z -= move_rate * Math.sin(rot_x * Math.PI / 180);
                    x += move_rate * Math.cos(rot_x * Math.PI / 180);
                    break;

                case "d":
                    x -= move_rate * Math.cos(rot_x * Math.PI / 180);
                    z += move_rate * Math.sin(rot_x * Math.PI / 180);
                    break;

                case "q":
                    z -= move_rate * Math.cos((rot_x) * Math.PI / 180);
                    x -= move_rate * Math.sin((rot_x) * Math.PI / 180);
                    break;

                case "e":
                    z += move_rate * Math.cos(rot_x * Math.PI / 180);
                    x += move_rate * Math.sin(rot_x * Math.PI / 180);
                    break;

                case "ArrowUp":
                    rot_y = Math.max(rot_y - rot_rate, 1);
                    break;

                case "ArrowDown":
                    rot_y = Math.min(rot_y + rot_rate, 179);
                    break;

                case "ArrowLeft":
                    rot_x = (rot_x + rot_rate) % 360;
                    break;

                case "ArrowRight":
                    rot_x = (rot_x - rot_rate) % 360;
                    break;
            }
        }
        draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures);
        camera.getContext("2d");
        requestAnimationFrame(action)
    };
    action();
}

function pushMatrix(m) {
    mat_stack.push(new Matrix4(m));
}

function popMatrix() {
    return mat_stack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures) {
    const USE_TEXTURES = gl.getUniform(gl.program, u_UseTextures);
    gl.uniform3fv(u_LightColor, LIGHT_COLORS);
    gl.uniform3fv(u_LightPosition, LIGHT_POSITIONS);
    gl.clearColor(1, 0.8, 0.7, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let lookAtX = x + Math.sin(rot_x * Math.PI / 180) * Math.sin(rot_y * Math.PI / 180);
    let lookAtY = y + Math.cos(rot_y * Math.PI / 180);
    let lookAtZ = z + Math.cos(rot_x * Math.PI / 180) * Math.sin(rot_y * Math.PI / 180);

    viewMatrix.setLookAt(x, y, z, lookAtX, lookAtY, lookAtZ, 0, 1, 0);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    camera.getContext("2d");

    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);

    modelMatrix.setTranslate(0, 0, 0);
    modelMatrix.rotate(yAngle, 0, 1, 0);
    modelMatrix.rotate(xAngle, 1, 0, 0);

    if (textures) {
        gl.uniform1i(u_UseTextures, 1);
    }


    // floor
    let n = initVertexBuffers(gl, 204 / 255, 204 / 255, 204 / 255, 1);
    pushMatrix(modelMatrix);
    modelMatrix.scale(10.0, 0.05, 10.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // ceiling
    gl.activeTexture(gl.TEXTURE7);
    gl.uniform1i(u_Sampler, 7);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 6, 0);
    modelMatrix.scale(10.0, 0.05, 10.0);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // wall 1
    n = initVertexBuffers(gl, 100 / 255, 100 / 255, 100 / 255, 1);
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 3, -5);
    modelMatrix.scale(10.0, 6.0, 0.05);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // wall 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-5, 3, 0);
    modelMatrix.scale(0.05, 6.0, 10);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // wall 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(5, 3, 0);
    modelMatrix.scale(0.05, 6.0, 10);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    //table
    n = initVertexBuffers(gl, 0 / 255, 255 / 255, 255 / 255, 1);
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);
    let coord = [3, -1]

    // table surface
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 1, coord[1]);
    modelMatrix.scale(2, 0.1, 6);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // table leg 1
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.7, 0.5, coord[1] - 2.7);
    modelMatrix.scale(0.1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // table leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.7, 0.5, coord[1] - 2.7);
    modelMatrix.scale(0.1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // table leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.7, 0.5, coord[1] + 2.7);
    modelMatrix.scale(0.1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // table leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.7, 0.5, coord[1] + 2.7);
    modelMatrix.scale(0.1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // chair seat 1
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [2, -3]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 11
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 12
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 13
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 14
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 11
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 12
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 13
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();



    // chair seat 2
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [2, -1]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 21
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 22
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 23
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 24
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 21
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 22
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 23
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // chair seat 3
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [2, 1]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 31
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 32
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 33
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 34
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 - chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 31
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 32
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 33
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 - chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // chair seat 4
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [4, -1]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 41
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 42
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 43
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 44
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 41
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 42
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 43
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // chair seat 5
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [4, -3]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 51
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 52
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 53
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 54
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 51
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 52
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 53
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // chair seat 6
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    coord = [4, 1]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + chairs_move, 0.5, coord[1]);
    modelMatrix.scale(0.7, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 61
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] - 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 62
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1] + 0.5);
    modelMatrix.scale(0.1, 1.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 63
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] - 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair leg 64
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.3 + chairs_move, 0.25, coord[1] + 0.45);
    modelMatrix.scale(0.1, 0.5, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 61
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1.25, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 62
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 1, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // chair back 63
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.3 + chairs_move, 0.75, coord[1]);
    modelMatrix.scale(0.1, 0.1, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    //chest
    gl.activeTexture(gl.TEXTURE10);
    gl.uniform1i(u_Sampler, 10);
    n = initVertexBuffers(gl, 255 / 255, 100 / 255, 100 / 255, 1);
    coord = [4, 3.5]
    // bottom
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 0.05, coord[1]);
    modelMatrix.scale(1, 0.1, 2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // back
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.45, 0.525, coord[1]);
    modelMatrix.scale(0.1, 1, 2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // front
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.45, 0.525, coord[1]);
    modelMatrix.scale(0.1, 1, 2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // side 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 0.525, coord[1] + 1);
    modelMatrix.scale(1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // side 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 0.525, coord[1] - 1);
    modelMatrix.scale(1, 1, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // top
    pushMatrix(modelMatrix);
    if (chest) {
        modelMatrix.translate(coord[0] + 0.1, 1.4, coord[1] + 0.1);
        modelMatrix.rotate(45, 0, 0, -1)
    } else {
        modelMatrix.translate(coord[0], 1, coord[1]);
    }
    modelMatrix.scale(1, 0.1, 2);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // speaker
    gl.activeTexture(gl.TEXTURE9);
    gl.uniform1i(u_Sampler, 9);
    n = initVertexBuffers(gl, 70 / 255, 70 / 255, 70 / 255, 1);
    coord = [-4, -3.5]
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 1 + (speaker_move * 0.5), coord[1]);
    modelMatrix.rotate(45, 0, 1, 0)
    modelMatrix.scale(1, 2, 1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // speaker thing 1
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    n = initVertexBuffers(gl, 1, 1, 1, 1);
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.32, 1.5 + (speaker_move * 0.5), coord[1] + 0.32);
    modelMatrix.rotate(45, 0, 1, 0)
    modelMatrix.rotate(speaker_move, 0, 0, 1)
    modelMatrix.scale(0.4 + speaker_move, 0.4 + speaker_move, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // speaker thing 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.32, 0.6 + (speaker_move * 0.5), coord[1] + 0.32);
    modelMatrix.rotate(45, 0, 1, 0)
    modelMatrix.rotate(speaker_move, 0, 0, 1)
    modelMatrix.scale(0.6 + speaker_move, 0.6 + speaker_move, 0.1);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // big chair
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);
    n = initVertexBuffers(gl, 150 / 255, 50 / 255, 50 / 255, 1);
    coord = [-3, 3]
    // big chair part 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0], 0.25, coord[1]);
    modelMatrix.rotate(-45, 0, 1, 0)
    modelMatrix.scale(1.5, 0.5, 1.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // big chair part 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.34, 1, coord[1] + 0.34);
    modelMatrix.rotate(-45, 0, 1, 0)
    modelMatrix.scale(1.5, 1, 0.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // big chair part 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] - 0.5, 0.5, coord[1] - 0.5);
    modelMatrix.rotate(-45, 0, 1, 0)
    modelMatrix.scale(0.5, 1, 1.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // big chair part 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(coord[0] + 0.5, 0.5, coord[1] + 0.5);
    modelMatrix.rotate(-45, 0, 1, 0)
    modelMatrix.scale(0.5, 1, 1.5);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    // lamp
    gl.uniform1i(u_UseTextures, 0);
    if (lamp) {
        n = initVertexBuffers(gl, 255 / 255, 255 / 255, 255 / 255, 0.7);
    } else {
        n = initVertexBuffers(gl, 255 / 255, 214 / 255, 170 / 255, 0.9);
    }
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 2.5, -4.95);
    modelMatrix.scale(0.7, 0.7, 0.05);
    drawBox(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.uniform1i(u_UseTextures, USE_TEXTURES);
}

function drawBox(gl, u_ModelMatrix, u_NormalMatrix, n) {
    pushMatrix(modelMatrix);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    modelMatrix = popMatrix();
}

function loadTexture(gl, tex, textureIndex) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.image);
}

function initArrayBuffer(gl, attribute, data, num, type) {
    let buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    let a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return true;
}

function initVertexBuffers(gl, r, g, b, a) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    let vertices = new Float32Array([ // Coordinates
        0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, // v0-v1-v2-v3 front
        0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, // v0-v3-v4-v5 right
        0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
        -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, // v1-v6-v7-v2 left
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, // v7-v4-v3-v2 down
        0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5 // v4-v7-v6-v5 back
    ]);

    let colors = new Float32Array([ // Colors
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a, // v0-v1-v2-v3 front
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a, // v0-v3-v4-v5 right
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a, // v0-v5-v6-v1 up
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a, // v1-v6-v7-v2 left
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a, // v7-v4-v3-v2 down
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a // v4-v7-v6-v5 back
    ]);

    let normal = new Float32Array([ // Normal
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // v0-v1-v2-v3 front
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5 right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, // v7-v4-v3-v2 down
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0 // v4-v7-v6-v5 back
    ]);

    let texCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0 // v4-v7-v6-v5 back
    ]);

    let indices = new Uint8Array([
        0, 1, 2, 0, 2, 3, // front
        4, 5, 6, 4, 6, 7, // right
        8, 9, 10, 8, 10, 11, // up
        12, 13, 14, 12, 14, 15, // left
        16, 17, 18, 16, 18, 19, // down
        20, 21, 22, 20, 22, 23 // back
    ]);

    if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Color', colors, 4, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normal, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_TexCoords', texCoords, 2, gl.FLOAT)) return -1;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}