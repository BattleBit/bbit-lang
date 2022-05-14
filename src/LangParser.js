const fs = require("fs");

// date utilities
function parseDate(text) {
    const split = text.split("/");
    const day = parseInt(split[0]);
    const month = parseInt(split[1]);
    const year = parseInt(split[2]);

    const date = new Date(0);
    date.setYear(year);
    date.setMonth(month - 1);
    date.setDate(day);

    return date;
}

function makeDate(date) {
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    let dd = date.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    return dd + '/' + mm + '/' + yyyy;
}

class LangParser {
    constructor(data) {
        this.langMap = {};

        // convert crlf to lf and split by new line
        const lines = data.replaceAll("\r", "").split("\n");
        this.encoding = lines.shift().split("=")[1];

        // parse updates
        const updates = lines.shift().split(": ")[1].split(", ");
        this.updates = [];
        for (const update of updates) {
            const upd = {};
            const info = update.split(" ");
            upd.author = info.shift();
            upd.date = parseDate(/\(([^)]+)\)/.exec(info.shift())[1]);

            this.updates.push(upd);
        }

        for (const line of lines) {
            if (!line.length || line.startsWith("//") || !/^\d/.test(line))
                continue;

            const split = line.split("=");
            const number = parseInt(split.shift());
            const text = split.join("=");

            this.langMap[number] = text;
        }

        return this;
    }

    static fromFile(filePath, encoding = "UTF8") {
        return this.fromText(fs.readFileSync(filePath, encoding));
    }

    static fromText(text) {
        return new LangParser(text)
    }

    toFile(filePath) {
        return fs.writeFileSync(filePath, this.generateText(), this.encoding);
    }

    generateText() {
        let langText = `Encoding=${this.encoding}\r\n`;

        const updateToText = (update) => {
            return `${update.author} (${makeDate(update.date)})`
        }
        let updates = [];
        for (const update of this.updates) {
            updates.push(updateToText(update));
        }

        langText += `Updates: ${updates.join(", ")}\r\n`;

        // add the disclaimer
        langText += `\r\n// @1= these are variables, DO NOT CHANGE\r\n\r\n`;

        for (let i = 0; i <= this.highestNumber(); i++) {
            if (!this.exists(i))
                continue;

            const text = this.get(i);

            langText += `${i}=${text}\r\n`;
        }

        return langText;
    }

    get(number) {
        if (!this.exists(number)) {
            throw "invalid number";
        }

        return this.langMap[number];
    }

    exists(number) {
        return this.langMap.hasOwnProperty(number);
    }

    set(number, new_text) {
        if (!this.langMap.hasOwnProperty(number)) {
            throw "invalid number";
        }

        this.langMap[number] = new_text;
    }

    highestNumber() {
        let highest = 0;
        for (const number in this.langMap) {
            const int = parseInt(number);
            if (int > highest)
                highest = int;
        }

        return highest;
    }

    add(text, number) {
        if (isNaN(number)) {
            number = this.highestNumber() + 1;
        }

        if (this.exists(number)) {
            throw "already exsits";
        }

        this.langMap[number] = text;

        return number;
    }

    addUpdate(author, date) {
        const _date = new Date(date);
        if (isNaN(_date.getTime())) {
            throw "invalid date";
        }

        this.updates.unshift({ author, date: moment(_date).format("DD/MM/YYYY") });
    }

    filter(cb) {
        for (let i = 0; i <= this.highestNumber(); i++) {
            if (!this.exists(i))
                continue;

            const text = this.get(i);

            this.set(i, cb(text));
        }
    }

    remove(number) {
        if (!this.exists(number)) {
            throw "doesn't exist";
        }

        delete this.langMap[number];
    }
}

module.exports = LangParser;