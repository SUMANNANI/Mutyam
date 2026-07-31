import movies from "../../data/games/movies.json" assert { type: "json" };

const userGuesses = new Map();

function getTodayKey() {
    return new Date().toISOString().split("T")[0];
}

export function getDailyMovie() {
    const today = getTodayKey();

    const seed = [...today].reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
    );

    return movies[seed % movies.length];
}

export function checkMovieAnswer(answer) {
    if (!answer) return false;

    return (
        answer.trim().toLowerCase() ===
        getDailyMovie().title.toLowerCase()
    );
}

export function hasUserGuessedToday(userId) {
    const key = `${userId}:${getTodayKey()}`;
    return userGuesses.has(key);
}

export function saveUserGuess(userId) {
    const key = `${userId}:${getTodayKey()}`;
    userGuesses.set(key, true);
}

export function getMovieReward() {
    return Math.floor(Math.random() * 401) + 200;
}