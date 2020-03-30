'use strict';
const request = require('request');
const stringSimilarity = require('string-similarity')
const TMDB = require('../config').TMDB;
const createResponse = require('./createResponse');
const MAX_CONFIDENCE = 0.7;
const axios = require('axios')
const FBeamer = require('../fbeamer');
const config = require('../config');
const f = new FBeamer(config.FB);


const extractEntity = (nlp, entity) => {
    
    let objList = nlp[entity];
    let  valueList = []
    if(objList){
        objList.forEach(obj => {
            if(obj.confidence > MAX_CONFIDENCE)
            {
                valueList.push(obj.value)
            }
        })
        if(valueList) {
            return valueList;
        } 
    }else {
        return null;
    }
    
}

const getRandomCocktail = ()=>{
    let message = null;
    let image = null;
    let quick_reply =null;
    return new Promise((resolve, reject) => {
        axios({
            "method":"GET",
            "url":"https://the-cocktail-db.p.rapidapi.com/random.php",
            "headers":{
            "content-type":"application/octet-stream",
            "x-rapidapi-host":"the-cocktail-db.p.rapidapi.com",
            "x-rapidapi-key":"bfa74590cdmsheaa847434d7a1b6p11d7c0jsnabf0f56f64d9"
            }
            })
            .then((response)=>{
                response = response.data.drinks[0]
                // console.log(response.data.drinks[0])
              let data = {
                  strDrink : response.strDrink,
                  strCategory: response.strCategory,
                  strGlass : response.strGlass,
                  strInstructions : response.strInstructions,
                  strDrinkThumb : response.strDrinkThumb
              }
            message = `${data.strDrink} - ${data.strCategory}
${data.strInstructions}
serve with ${data.strGlass}`.substring(0, 640)
              message = f.txt(message)
              image = f.img(data.strDrinkThumb)
              let replies = [{title: "new random cocktail",payload:"randomCocktail"}]
              quick_reply = f.quick_reply("this potion doesn't inspire you?",replies)
              resolve({message,image,quick_reply});
            })
            .catch((error)=>{
                console.log("error in create response")
              reject(error);
            })
    })
}

const replyGreetings = () =>{
    return new Promise((resolve, reject) => {
        
        let message = `Hello bro, 
I'm a drink genius. I can suprise you with a random cocktatil !
else indicate me what do you have in your fridge?`.substring(0, 640);
        //console.log(message)
        message = f.txt(message)
        resolve({message});
    })
    .catch((error)=>{
        console.log("error in create response")
        reject(error);
    })
}

const replyHaveIngredients = (ingredients) =>{
    let data = []
    let message = ""
    let quick_reply = null
    // we create a list of all ingredients in our API
    const ingredientsJSON = require('./ingredients.json')
    let ingredientsList = []
    ingredientsJSON.drinks.forEach(element => {
        ingredientsList.push(element.strIngredient1)
    });
    ingredients.forEach( ingr => {
        // we find the best match between the user prompt and the API's ingredients
        let matches = stringSimilarity.findBestMatch(ingr, ingredientsList)
        
        // console.log("----------------------------------------------------------------------------------------------------")
        // console.log(ingr)
        // console.log(matches)
        // matches.ratings.forEach(match =>{
            // if(match.rating>0.4)
            //     console.log(match.target,match.rating)
        // })
        
        if(matches.bestMatch.rating>0.3){
            data.push(ingredientsList[matches.bestMatchIndex])
        }
        else{
            data.push(ingr)
        }
    });
    console.log("prompt ingredients",ingredients)
    console.log("ingredints formated",data)
    return new Promise((resolve, reject) => {
        let replies = []
        axios({
            "method":"GET",
            "url":"https://the-cocktail-db.p.rapidapi.com/filter.php",
            "headers":{
            "content-type":"application/octet-stream",
            "x-rapidapi-host":"the-cocktail-db.p.rapidapi.com",
            "x-rapidapi-key":"bfa74590cdmsheaa847434d7a1b6p11d7c0jsnabf0f56f64d9"
            },"params":{
            "i": data[0]
            }
            })
            .then((response)=>{
                let drinks = response.data.drinks
                // we first check if there is a correspondance in the API
                // if nothing
                if(!response.data){
                    console.log("pas de correspondance")
                    message =
`sober night for you...
I don't find cocktail with ${data[0]}`    
                }
                //if a correspondance in the API
                else{
                    if(drinks.length>5){
                        message = 
    `not a sober night for you...
I find many good ideas !`
                    }
                    else{
                        message = `i find ${data.length} ways to drink !`
                    }
                    while(drinks.length>10){
                        // i drop one random drink of my list
                        drinks.splice(Math.floor(Math.random() * drinks.length),1)
                    }
                    drinks.forEach(drink =>{
                        // in our api, we dont have an endpoint to search cocktail by name
                        // we have to pass in payload $intent$idDrink (in this case intent= cocktailByName)
                        replies.push({title:drink.strDrink, payload:"cocktailByName"+drink.idDrink})
                    })
                    // quickly reply is composed by an text header and replies {text, payload}
                    if(drinks.length!=0)
                        quick_reply = f.quick_reply("click one if you to be drunk",replies)
                }
                message = f.txt(message)
                resolve({message,quick_reply})
            })
            .catch((error)=>{
              reject(error)
            })
        
    })
}

const getCocktailByName = (drink) =>{
    let message = ""
    let image = ""
    return new Promise((resolve, reject) => {
        axios({
            "method":"GET",
            "url":"https://the-cocktail-db.p.rapidapi.com/lookup.php",
            "headers":{
            "content-type":"application/octet-stream",
            "x-rapidapi-host":"the-cocktail-db.p.rapidapi.com",
            "x-rapidapi-key":"bfa74590cdmsheaa847434d7a1b6p11d7c0jsnabf0f56f64d9"
            },"params":{
            "i":drink
            }
            })
            .then((response)=>{
                response = response.data.drinks[0]
            //   console.log(response.data.drinks[0])
              let data = {
                  strDrink : response.strDrink,
                  strCategory: response.strCategory,
                  strGlass : response.strGlass,
                  strInstructions : response.strInstructions,
                  strDrinkThumb : response.strDrinkThumb
              }
            message = `${data.strDrink} - ${data.strCategory}
${data.strInstructions}
serve with ${data.strGlass}`.substring(0, 640)
              message = f.txt(message)
              image = f.img(data.strDrinkThumb)
              resolve({message,image});
            })
            .catch((error)=>{
                console.log("error in create response")
              reject(error);
            })
    })
}



module.exports = nlpData => {
    return new Promise(async function(resolve, reject) {
        let intent = extractEntity(nlpData, 'intent');
        // let intent = "haveIngredients"
        // console.log("intents :",intent)
        // console.log(nlpData)
        if(intent) {
           
            intent = intent[0]


            let ingredients = extractEntity(nlpData,'ingredient')
            let drink = extractEntity(nlpData,'drink')
            // Get data (including id) about the movie
            // Get director(s) using the id
            // Create a response and resolve back to the user
            try {
                let messageReply = f.txt("Error in tbdb")
                switch(intent){
                    case "haveIngredients":
                        if(ingredients){
                            console.log("detect ingredients",ingredients)
                            messageReply = await replyHaveIngredients(ingredients)
                        }
                        else{
                            console.log("detect no ingredient")
                            messageReply = {message: f.txt("Sorry, I don't know your ingredients")}
                        }
                        break;
                    case "greetings":
                        messageReply = await replyGreetings()
                        break;
                    case "randomCocktail":
                        messageReply = await getRandomCocktail();
                        break;
                    case "cocktailByName":
                        if(drink.length!=0){
                            drink = drink[0]
                            messageReply = await getCocktailByName(drink)
                        }
                        else{
                            messageReply = {message: f.txt("Sorry, I don't know this drink")}
                        }
                        //messageReply = await hello();
                        break;
                }
                // let movieData = await getMovieData(movie, releaseYear);
                // let director = await getDirector(movieData.id);
                // let response = createResponse(intent, movieData, director);
                resolve(messageReply);
            } catch(error) {
                reject(error);
            }

        } else {
            resolve({
                
                    text: "I'm not sure I understand you!\n Let's be polite, say me first Hello !"
                
            });
        }
        
    });
}