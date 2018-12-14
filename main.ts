import fs, {WriteStream} from 'fs';
import path from 'path';
import request from 'request';
import {bindNodeCallback, combineLatest, from, fromEvent, Observable, of} from 'rxjs'
import {delay, map, mergeMap, switchMap} from "rxjs/operators";
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

function downloadFile(sourceUrl: string, targetPath: string): Observable<string> {
  const stream: WriteStream = request(sourceUrl).pipe(fs.createWriteStream(targetPath));
  const events = ['finish', 'error'];
  return from(events).pipe(
    mergeMap((event) => fromEvent(stream, event)),
    map(() => path.basename(targetPath))
  );
}

function downloadBlogPart(blogName: string, params: any, alreadyDownloadedCount: number): Observable<number> {
  return blogPosts(blogName, 'photo', params).pipe(
    switchMap((response: any) => {
      const blogPhotosPath = path.join('download', response.blog.name);
      const downloads: Observable<string>[] = [];
      if (!fs.existsSync(blogPhotosPath)) fs.mkdirSync(blogPhotosPath);
      response.posts.forEach((post => {
        if (post.photos) {
          post.photos.forEach((photo => {
            const sourceUrl = photo.original_size.url;
            const fileName = path.basename(sourceUrl);
            const photoPath = path.join(blogPhotosPath, fileName);
            downloads.push(downloadFile(sourceUrl, photoPath));
          }));
        }
      }));
      return combineLatest(downloads);
    }),
    delay(1000),
    switchMap((downloadedFiles: string[]) => {
      alreadyDownloadedCount += downloadedFiles.length;
      if (downloadedFiles.length >= params.limit) {
        console.log('Downloaded', downloadedFiles.length, 'photos...');
        return downloadBlogPart(blogName, {
          limit: params.limit,
          offset: params.offset + params.limit
        }, alreadyDownloadedCount);
      }
      return of(alreadyDownloadedCount);
    })
  );
}

function downloadBlog(blogName: string): Observable<any> {
  const limit: number = 20;
  let offset: number = 0;
  return downloadBlogPart(blogName, {limit: limit, offset: offset}, 0);
}

downloadBlog('cutest-animals-here')
  .subscribe({
    next: (downloadedPhotosCount: number) => {
      console.log('Downloaded', downloadedPhotosCount, 'photos in total.');
      console.log('Job finished!');
    },
    error: (err) => {
      console.error(err);
    },
    complete: () => {
      console.log('???');
    }
  });