const steem = require('steem')
const db = require('./db')
const _ = require('lodash')
const INTERVAL = 1000 * 60 * 60 * 2 // 2 Hours

let config = require('../config');

module.exports.update = () => {
  setInterval(() => {
    storeLatestPhotoFeedPosts().then(data => updateFeaturedCount())
  }, INTERVAL)
}

function updateFeaturedCount() {
  getFeaturedPhotographerTotals().then(data => {
    let usernames = data.map(post => post.author)
    let numberOfFeaturedPosts = _.countBy(usernames);
    let uniqueAuthors = [...new Set(usernames)]

    processAllAuthorData(uniqueAuthors, numberOfFeaturedPosts)
    .then(data => storeFeaturedCount(data))
  })
}

function getPhotoFeedBlogEntries(){
  return steem.api.getBlogEntriesAsync('photofeed', 10000, 20)
}

function processAllAuthorData(uniqueAuthors, numberOfFeaturedPosts){
  return new Promise(function(resolve, reject) {
    steem.api.getAccountsAsync(uniqueAuthors).then(data => {
      data = data.map(user => {
        let json;
        try { json = JSON.parse(user.json_metadata).profile }
        catch(e){ console.log(e) }

        return {
          username: user.name,
          avatar: json ? json.profile_image : '',
          featured: numberOfFeaturedPosts[user.name]
        }
      })
      resolve(data)
    })
  });
}

function storeFeaturedCount(data){
  db.get().db('photofeed2').collection('photographers').remove({})
  for (var i = 0; i < data.length; i++) {
    db.get().db('photofeed2').collection('photographers').update( { username: data.username }, data[i], { upsert: true },(error, response) => {
      if(error || response == null) { console.log(error) }
    })
  }
  console.log('Featured Count Upated')
}

function getFeaturedPhotographerTotals() {
  return new Promise((resolve, reject) => {
    db.get().db('photofeed2').collection('posts').find().toArray((error, response) => {
      if(error || response == null) console.log(error)
      resolve(response)
    })
  });
}

function storeLatestPhotoFeedPosts(){
  return new Promise(function(resolve, reject) {
    getPhotoFeedBlogEntries().then(posts => {
      for (var i = 0; i < posts.length; i++) {
        db.get().db('photofeed2').collection('posts').update({entry_id: posts[i].entry_id } ,posts[i], { upsert: true }, (error, response) => {
          if(error || response == null) console.log(error)
        })
      }
    })
    resolve()
  });
}
