(function (){
    const fs        = require('fs')
    const db        = require('../db')
    const config    = require('../config.json')
    let m           = db.get('memory')
    let vocabulary  = db.get('vocabulary')

    function getVerbs() {
        let verbs = {}
        let files = fs.readdirSync(config.verbs_dir)
        files.forEach((file) => {
            verb = require('.' + config.verbs_dir + '/' + file)
            verbs[verb.name] = verb
        })
        return verbs
    }

    function init() {
        if (undefined === vocabulary) {
            vocabulary = {}
        }
        if (undefined === vocabulary.adjectives){
            vocabulary.adjectives = {}
        }
        if (undefined === vocabulary.questions) {
            let default_questions = {'who': {},
                                     'what':{},
                                     'when':{},
                                     'where':{},
                                     'which':{},
                                     'how': {}}
            vocabulary.questions = default_questions
        }
        if (undefined === vocabulary.verbs){
            vocabulary.verbs = getVerbs()
        }
        if (undefined === vocabulary.punctuation){
            let default_punctuation = ".?!,'\"; "
            vocabulary.punctuation = default_punctuation
        }
        db.insert('vocabulary', vocabulary)
    }
    
    function epur(word) {
        return word.replace(/\s/g, '').toLowerCase().replace(',', '')
    }

    function removeFromArray(array, index) {
        return array.slice(0,index).concat(array.slice(index + 1))
    }

    function getWordsByType(type, words) {
        let topic = vocabulary[type]
        let found = []
        let extras = []

        for (let i = 0; i < words.length; i++) {
            let word = epur(words[i])
            let isFound = false
            for (let item in topic) {
                if (topic[item].regex !== undefined) {
                    re = new RegExp(topic[item].regex, "i")
                    if (re.test(word)){
                        found.push(item)
                        isFound = true
                    }
                }
                else if (item == word) {
                    found.push(item)
                    isFound = true
                }
            }
            if (!isFound){
                extras.push(word)
            }        
        }
        console.log(type, extras)
        return {found: found, words: extras}
    }

    function adaptPronoun(subject, from) {
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

    function getSubjects(words, from) {
        let subjects = []
        for (let i = 0; i < words.length; i++) {
            let word = epur(words[i])
            if (vocabulary.punctuation.indexOf(word) === -1){
                let pronoun = adaptPronoun(word, from)
                if (pronoun !== word){
                    subjects.push(pronoun)
                    words = removeFromArray(words, i)
                }
                else if (undefined !== m.people.names[word] ||
                         undefined !== m.people.nicknames[word]){
                    subjects.push(word)
                    words = removeFromArray(words, i)
                }
            }
            else{
                words = removeFromArray(words, i)
            }
        }
        return {found: subjects, words: words}
    }

    function process(message, from) {
        m = db.get('memory')
        let words = message.match(/\S+\s*/g)
        let verbs = getWordsByType('verbs', words)
        let questions = getWordsByType('questions', verbs.words)
        let adjectives = getWordsByType('adjectives', questions.words)
        let subjects = getSubjects(adjectives.words, from)

        return {
            questions: questions.found,
            subjects: subjects.found,
            verbs: verbs.found,
            adjectives: adjectives.found,
            extra: subjects.words
        }
    }

    module.exports = {
        init: init,
        process: process
    }
})()
