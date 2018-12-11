import fs from 'fs';
import path from 'path';
import request from 'request';
import {bindNodeCallback, Observable, of} from 'rxjs'
import {delay, map, switchMap} from "rxjs/operators";
import {createClient as createTumblrClient, TumblrClient, TumblrClientCallback} from 'tumblr.js';
import {consumerKey, consumerSecret} from './secrets/keys';

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

function downloadBlogPart(blogName: string, params: any): Observable<number> {
  return blogPosts(blogName, 'photo', params).pipe(
    map((response: any) => {
      const blogPhotosPath = path.join('download', response.blog.name);
      if (!fs.existsSync(blogPhotosPath)) fs.mkdirSync(blogPhotosPath);
      response.posts.forEach((post => {
        if (post.photos) {
          post.photos.forEach((photo => {
            const sourceUrl = photo.original_size.url;
            const fileName = path.basename(sourceUrl);
            const photoPath = path.join(blogPhotosPath, fileName);
            request(sourceUrl).pipe(fs.createWriteStream(photoPath));
          }));
        }
      }));
      return response.posts.length;
    }),
    delay(4000),
    switchMap((postsCount: number) => {
      if (postsCount == params.limit) {
        return downloadBlogPart(blogName, {limit: params.limit, offset: params.offset + params.limit});
      }
      return of(postsCount);
    })
  );
}

function downloadBlog(blogName: string): Observable<any> {
  const limit: number = 20;
  let offset: number = 0;
  return downloadBlogPart(blogName, {limit: limit, offset: offset});

}

downloadBlog('cutest-animals-here')
  .subscribe({
    next: () => {
      console.log('Job finished');
    },
    error: (err) => {
      console.error(err);
    },
  });