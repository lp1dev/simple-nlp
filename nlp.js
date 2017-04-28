const db = require('../db')
const config = require('../config.json')
var vocabulary = db.get('vocabulary')

function init() {
    if (undefined === vocabulary) {
        vocabulary = {}
    }
    if (undefined === vocabulary.questions) {
        var default_questions = {'who': {},
                                 'what':{},
                                 'when':{},
                                 'where':{},
                                 'which':{},
                                 'how': {}}
        vocabulary.questions = default_questions
    }
    if (undefined === vocabulary.verbs){
        var default_verbs = {
            'to_be': {regex: '\b(is|are|being|to be|am)\b'}
        }
        vocabulary.verbs = default_verbs
    }
    if (undefined === vocabulary.punctuation){
        var default_punctuation = ".?!,'\";"
        vocabulary.punctuation = default_punctuation
    }
    db.insert('vocabulary', vocabulary)
}

function epur(word) {
    return word.replace(' ', '').toLowerCase()
}

function removeFromArray(array, index){
    return array.slice(0,index).concat(array.slice(index + 1));
}

function getWordsByType(type, words) {
    var topic = vocabulary[type]
    var found = []

    for (var i = 0; i < words.length; i++) {
        var word = epur(words[i])
        for (var item in topic) {
            if (topic[item].regex !== undefined) {
                re = new RegExp(topic[item].regex, "i")
                console.log('regex', re)
                if (re.test(word)){
                    found.push(item)
                    words = removeFromArray(words, i)
                }
            }
            else if (item == word) {
                found.push(item)
                words = removeFromArray(words, i)
            }
        }
    }
    return {found: found, words: words}   
}

function adaptPronoun(subject, from){
    switch (subject){
    case 'bot':
    case 'you':
        return 'lp4'
        break
    case 'i':
        return from.toLowerCase()
        break
    case 'she':
        return 'her'
    case 'he':
        return 'him'
    }
    return subject
}

function getSubjects(words, from){
    var subjects = []
    for (var i = 0; i < words.length; i++) {
        var word = epur(words[i])
        if (vocabulary.punctuation.indexOf(word) === -1){
            subjects.push(adaptPronoun(word, from))
            words = removeFromArray(words, i)
        }
    }
    return {found: subjects, words: words}
}

function process(message, from)  {
    var words = message.match(/\S+\s*/g);
    console.log('words', words)
    var verbs = getWordsByType('verbs', words)
    var questions = getWordsByType('questions', verbs.words)
    var subjects = getSubjects(questions.words, from)
    return {questions: questions.found, subjects: subjects.found, verbs: verbs.found, adjectives: subjects.words}
}

module.exports = {
    init: init,
    process: process
}
