import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function generateBlurredPoster(movie) {
  const baseDir = process.cwd();
  let poster = path.resolve(baseDir, "data/games/movie/posters", `${movie.title}.jpg`);
  const out = path.resolve(baseDir, "data/games/movie/current.jpg");

  if (!fs.existsSync(poster)) {
    const files = fs.readdirSync(path.resolve(baseDir, "data/games/movie/posters"));
    if (files.length > 0) {
      poster = path.resolve(baseDir, "data/games/movie/posters", files[0]);
    }
  }

  // Sharp handles blur cleanly in 1 line
  await sharp(poster)
    .blur(30)
    .toFile(out);

  return out;
}
