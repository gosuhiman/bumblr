import {tap} from "rxjs/operators";
import {createClient as createTumblrClient, TumblrClient, TumblrClientCallback} from 'tumblr.js';
import {bindNodeCallback, Observable} from 'rxjs'
import {consumerKey, consumerSecret} from './secrets/keys';
import request from 'request';
import fs from 'fs';
import path from 'path';

const client: TumblrClient = createTumblrClient({
  credentials: {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
  },
  returnPromises: true
});

type blogPostsFnType = (blogIdentifier: string, type: string, params: any, callback: TumblrClientCallback) => void;
const blogPostsFn: blogPostsFnType = client.blogPosts;
const blogPosts = bindNodeCallback(blogPostsFn);

function downloadBlog(blogName: string): Observable<any> {
  return blogPosts(blogName, 'photo', {offset: 320}).pipe(tap((response: any) => {
    response.posts.forEach((post => {
      if (post.photos) {
        const blogPhotosPath = path.join('download', post.blog.name);
        if (!fs.existsSync(blogPhotosPath)) fs.mkdirSync(blogPhotosPath);
        post.photos.forEach((photo => {
          const sourceUrl = photo.original_size.url;
          const fileName = path.basename(sourceUrl);
          const photoPath = path.join(blogPhotosPath, fileName);
          request(sourceUrl).pipe(fs.createWriteStream(photoPath));
        }));
      }
    }));
  }));
}

downloadBlog('friendly-animals')
  .subscribe({
    next: () => {
      console.log('Job finished');
    },
    error: (err) => {
      console.error(err);
    },
  });