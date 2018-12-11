import {createClient as createTumblrClient, TumblrClient} from "tumblr.js";
import {bindCallback} from 'rxjs'
import {consumerKey, consumerSecret} from "./secrets/keys";

const client: TumblrClient = createTumblrClient({
  credentials: {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
  },
  returnPromises: true
});

const blogPosts = bindCallback(client.blogPosts);

blogPosts('friendly-animals')
  .subscribe(posts => {
    console.log(posts);
  });