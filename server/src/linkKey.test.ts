import { linkKey } from "@pinch/shared";
import { expect, test } from "vitest";

// shared/ has no tests of its own: its code is tested here, as emojiSchema.test.ts does.
test.each([
  // Instagram: a reel, a post, IGTV, the app's share link, under the author's name.
  ["https://www.instagram.com/reel/C9xAbc_1-z/", "instagram:C9xAbc_1-z"],
  ["https://www.instagram.com/reel/C9xAbc_1-z/?igsh=MWQ1ZGUxMzBkMA==", "instagram:C9xAbc_1-z"],
  ["https://instagram.com/reels/C9xAbc_1-z", "instagram:C9xAbc_1-z"],
  ["http://m.instagram.com/p/C9xAbc_1-z/?utm_source=ig_web_copy_link", "instagram:C9xAbc_1-z"],
  ["https://www.instagram.com/tv/C9xAbc_1-z/#comments", "instagram:C9xAbc_1-z"],
  ["https://www.instagram.com/chef.dana/reel/C9xAbc_1-z/", "instagram:C9xAbc_1-z"],
  // YouTube: a short, a video, its short link, embedded, live.
  ["https://youtube.com/shorts/dQw4w9WgXcQ?si=abcDEF", "youtube:dQw4w9WgXcQ"],
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "youtube:dQw4w9WgXcQ"],
  ["https://m.youtube.com/watch/?feature=share&v=dQw4w9WgXcQ", "youtube:dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ?si=abcDEF", "youtube:dQw4w9WgXcQ"],
  ["https://www.youtube.com/embed/dQw4w9WgXcQ", "youtube:dQw4w9WgXcQ"],
  ["https://www.youtube.com/live/dQw4w9WgXcQ?utm_campaign=x", "youtube:dQw4w9WgXcQ"],
  // Facebook: a reel, a video, a page's video.
  ["https://www.facebook.com/reel/1234567890/?mibextid=abc", "facebook:1234567890"],
  ["https://m.facebook.com/watch/?v=1234567890&rdid=x", "facebook:1234567890"],
  ["https://www.facebook.com/ChefDana/videos/1234567890/", "facebook:1234567890"],
  ["https://www.facebook.com/video.php?v=1234567890&ref=sharing", "facebook:1234567890"],
  // No id in the link: the link itself, without its hash, trailing slash or tracking; the rest
  // of its query stays, sorted, as it may name the post.
  ["https://fb.watch/aBc123/?mibextid=x", "url:fb.watch/aBc123"],
  ["https://www.facebook.com/share/r/1AbC2dE/#x", "url:facebook.com/share/r/1AbC2dE"],
  ["https://WWW.Instagram.com/stories/chef/123/", "url:instagram.com/stories/chef/123"],
  ["https://www.youtube.com/watch", "url:youtube.com/watch"],
  ["https://www.youtube.com/@chef", "url:youtube.com/@chef"],
  [
    "https://m.facebook.com/story.php?story_fbid=111&id=222&fbclid=x&utm_source=y",
    "url:facebook.com/story.php?id=222&story_fbid=111",
  ],
  [
    "https://www.facebook.com/permalink.php?story_fbid=111&id=222",
    "url:facebook.com/permalink.php?id=222&story_fbid=111",
  ],
  [
    "https://www.youtube.com/attribution_link?u=%2Fwatch%3Fv%3Dabc&feature=share",
    "url:youtube.com/attribution_link?u=%2Fwatch%3Fv%3Dabc",
  ],
])("%s is %s", (url, key) => {
  expect(linkKey(url)).toBe(key);
});

test("http and https, www. and m., and a trailing slash are the same link", () => {
  const keys = [
    "https://www.instagram.com/reel/C9x/",
    "http://instagram.com/reel/C9x",
    "https://m.instagram.com/reel/C9x//",
  ].map(linkKey);

  expect(new Set(keys)).toEqual(new Set(["instagram:C9x"]));
});

test("two Facebook stories are two posts; one with and without fbclid is one", () => {
  const first = linkKey("https://www.facebook.com/story.php?story_fbid=111&id=222");
  const second = linkKey("https://www.facebook.com/story.php?story_fbid=333&id=222");
  const tracked = linkKey("https://www.facebook.com/story.php?story_fbid=111&id=222&fbclid=IwAR0");

  expect(first).not.toBe(second);
  expect(tracked).toBe(first);
});
