
let index2word = {};
let word2index = {};
let model = null;
const max_len = 65;
let executed = false;
let previousInput = null;


let mainInput = document.getElementById("mainInput");

window.onload = function () {
    document.getElementById("loadingPane").hidden = true;
}


async function loadModel() {
    model = await tf.loadLayersModel('./model_js/model.json');
    input = []
    // for (let i = 0; i < 65; i++) {
    //     input.push(0)
    // }
    index2word = await fetch("./index2word.json").then(response => response.json())
    word2index = await fetch("./word2index.json").then(response => response.json())

}

function choice(events, size, probability) {
    if (probability != null) {
        const pSum = probability.reduce((sum, v) => sum + v).toFixed(5);
        if (pSum < 1 - Number.EPSILON || pSum > 1 + Number.EPSILON) {
            throw Error("Overall probability has to be 1.");
        }
        if (probability.find((p) => p < 0) != undefined) {
            throw Error("Probability can not contain negative values");
        }
        if (events.length != probability.length) {
            throw Error("Events have to be same length as probability");
        }
    } else {
        probability = new Array(events.length).fill(1 / events.length);
    }

    var probabilityRanges = probability.reduce((ranges, v, i) => {
        var start = i > 0 ? ranges[i - 1][1] : 0 - Number.EPSILON;
        ranges.push([start, v + start + Number.EPSILON]);
        return ranges;
    }, []);

    var choices = new Array();
    for (var i = 0; i < size; i++) {
        var random = Math.random();
        var rangeIndex = probabilityRanges.findIndex((v, i) => random > v[0] && random <= v[1]);
        choices.push(events[rangeIndex]);
    }
    return choices;
}

function encode(input) {
    input = input.split(' ');

    let encoded = [];
    for (let i = 0; i < input.length; i++) {
        if (input[i] == "") { continue; }
        let r = word2index[input[i].toLowerCase().trim()];
        if (r == undefined) {
            r = 1;
        }
        encoded.push(r);
    }
    for (let i = 0; i < max_len - input.length; i++) {
        encoded.unshift(0);
    }
    while (encoded.length > max_len) {
        encoded.shift();
    }
    return encoded;
}
async function predict(input, nextLen) {
    let result = "";
    for (let i = 0; i < nextLen; i++) {
        let token = encode(input);
        let probs = model.predict(tf.tensor2d([token]));
        let probs_array = await probs.data();
        let id = [];
        for (let j = 0; j < probs_array.length; j++) {
            id.push(j);
        }
        let predicted = choice(id, 1, probs_array);
        input += " " + index2word[predicted];
        result += " " + index2word[predicted];
    }
    return result.trim();
}

async function suggest(input) {
    executed = true;
    let result = [];
    const sentences = input.split('.');
    let inp = "";
    if (sentences.length == 1) {
        inp = sentences[0].toLowerCase().trim();
    }
    else {
        inp = sentences[sentences.length - 2].toLowerCase().trim() + ". " + sentences[sentences.length - 1].toLowerCase().trim();
    }
    let total = 16;
    let curr = 0;
    for (let i = 3; i < 7; i++) {
        for (let j = 0; j < 4; j++) {
            document.getElementById("progress").style = "width:" + (curr / total * 100) + "%";
            await tf.nextFrame()
            let r = await predict(inp, i);
            if (result.indexOf(r) == -1) {
                result.push(r);
            }
            curr++;
        }
    }
    console.log(result);

    return result;
}

function onClickSuggestion(suggestion) {
    let current = document.getElementById("mainInput").value;
    document.getElementById("mainInput").value = current + " " + suggestion;
}

async function onCompose() {
    document.getElementById("btCompose").hidden = true;
    document.getElementById("loadingPane").hidden = false;
    result = await suggest(document.getElementById("mainInput").value);
    let suggestionList = document.getElementById("suggestionList");
    suggestionList.innerHTML = "";
    for (let i = 0; i < result.length; i++) {
        let li = document.createElement("li");
        let bt = document.createElement("button");
        bt.innerHTML = result[i];
        bt.className = "suggestion";
        bt.onclick = () => onClickSuggestion(result[i]);
        li.appendChild(bt);
        suggestionList.appendChild(li);
    }
    document.getElementById("loadingPane").hidden = true;
    document.getElementById("btCompose").hidden = false;
}



loadModel();


