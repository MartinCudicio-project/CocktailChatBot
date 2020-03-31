var convert = require('xml-js');
var fs = require('fs');
const stringSimilarity = require('string-similarity')

function readXml(xmlFile) {
    var xmlDoc = fs.readFileSync(xmlFile)
    jsonDoc = convert.xml2json(xmlDoc, {
        compact: true,
        spaces: 4
    })
    return jsonDoc;
};


/** In order to look for the composition of an aliment
 * We are looking for the index that are the same as the one in parameter
 */
function searchComposition(compo, idAlim) {
    var results = [];
    compo.forEach(entry => {
        if (entry.alim_code._text == idAlim) {
            if (entry.teneur._text != null && entry.teneur._text > 20) {
                results.push(entry);
            }
        }
    });
    return results;
};

/** Gives us the nutritional interest of each ingredient
 * In order to get the const of an ingredient
 */
function getConst(lisConstH, id, listConst) {
    let results = [];
    id.forEach(element => {
        results.push(listConst[lisConstH[element]].const_nom_eng._text)
    });
    return results;
};

/** In order to initialize our dataset
 * We import our xml file, transform it into a json
 * After parsing the json we can return it
 */
let init = () => {
    let infoAlim = readXml('./data/alim.xml');
    let compoAlim = readXml('./data/compo.xml');
    let infoAlimJson = JSON.parse(infoAlim);
    let compoAlimJson = JSON.parse(compoAlim);
    let constAlim = readXml('./data/const.xml');
    let constAlimJson = JSON.parse(constAlim);

    return {
        infoAlimJson,
        compoAlimJson,
        constAlimJson
    }
};

/** In order to improve the searches, I create hash tables
 * 
 * @param {json with all the alim} infoAlimJson 
 * @param {json with all the const} constAlimJson 
 * 
 */
let initHTable = (infoAlimJson, constAlimJson) => {
    let infoAlimHTableEn = {};
    infoAlimJson.TABLE.ALIM.forEach((element, index) => {
        infoAlimHTableEn[element.alim_nom_eng._text.trim()] = index;
    });
    let infoAlimHTableFr = {};
    infoAlimJson.TABLE.ALIM.forEach((element, index) => {
        infoAlimHTableFr[element.alim_nom_fr._text.trim()] = index;
    });
    let constAlimTable = {};
    constAlimJson.TABLE.CONST.forEach((element, index) => {
        constAlimTable[element.const_code._text] = index;
    });
    return {
        infoAlimHTableEn,
        infoAlimHTableFr,
        constAlimTable
    };
};

let wayOfSorting = (a) => {
    return a.teneur;
}

function uniq(a) {
    return a.sort(wayOfSorting).filter(function (item, pos, ary) {
        return !pos || item != ary[pos - 1];
    })
}

let searchAlim = (ingredient, infoAlimHTableEn, infoAlimHTableFr, infoAlimJson) => {
    let idAlim = null;
    if (infoAlimHTableEn[ingredient] != null) {
        idAlim = infoAlimJson.TABLE.ALIM[infoAlimHTableEn[ingredient]].alim_code._text;
        console.log("FIND IN ENGLISH")
    } else {
        if (infoAlimHTableFr[ingredient] != null) {
            idAlim = infoAlimJson.TABLE.ALIM[infoAlimHTableFr[ingredient]].alim_code._text;
            console.log("FIND IN FRENCH")
        }
        else{
            ingredients.forEach(ingr => {
                let matchesEn = stringSimilarity.findBestMatch(ingr, infoAlimHTableEn)
                let matchesFr = stringSimilarity.findBestMatch(ingr, infoAlimHTableFr)
                if (matchesEn.bestMatch.rating > 0.3) {
                    idAlim.push(infoAlimJson[matches.bestMatchIndex])
                    console.log("BEST MATCH IN ENGLISH")
                } else if(matchesFr.bestMatch.rating > 0.3){
                    idAlim.push(infoAlimJson[matches.bestMatchIndex])
                    console.log("BEST MATCH IN FRENCH")
                }
            });
        }
    }

}

/** Main function that rule them all
 * First I initialize our data, then I look for the const that are composing our aliment
 */
module.exports.main = (ingredient) => {
    let {
        infoAlimJson,
        compoAlimJson,
        constAlimJson
    } = init();
    let {
        infoAlimHTableEn,
        infoAlimHTableFr,
        constAlimTable
    } = initHTable(infoAlimJson, constAlimJson);
    let response = false;
    let idAlim = searchAlim(ingredient, infoAlimHTableEn, infoAlimHTableFr, infoAlimJson);
    // We have to compare in order to know if the ingredient is in our database

    // if we get the ingredient, we are looking for its composition and its nutritional incomes
    if (idAlim != null) {
        let compo = compoAlimJson.TABLE.COMPO;
        let result = searchComposition(compo, idAlim);

        let id = [];
        let teneur = [];
        result.forEach(element => {
            teneur.push(element.teneur._text)
            id.push(element.const_code._text);
        });
        // After getting all the id of the nutritional incomes
        response = getConst(constAlimTable, id, constAlimJson.TABLE.CONST);
        response.forEach((element, index) => {
            let rep = element.split(',');
            response[index] = {
                values: rep[0],
                teneur: teneur[index]
            };
        });
        response = uniq(response);
    }
    console.table(response);
    return response;
};