const fsp = require("fs").promises;

const db = require("./../models/");
const {
    isArray
} = require("util");

function map_movie_request(movieDetails) {
    let movie = {};
    if (movieDetails.title) {
        movie.title = movieDetails.title;
    }
    if (movieDetails.duration) {
        movie.duration = movieDetails.duration;
    }
    if (movieDetails.releasedDate) {
        movie.releasedDate = movieDetails.releasedDate;
    }
    if (movieDetails.description) {
        movie.description = movieDetails.description;
    }
    if (movieDetails.poster) {
        movie.poster = movieDetails.poster;
    }
    if (movieDetails.wikiLink) {
        movie.wikiLink = movieDetails.wikiLink;
    }

    return movie;
}

module.exports = {
    list: async (req, res, next) => {
        try {
            const movies = await db.Movie.findAll();
            res.status(200).json({
                message: "movies list retreived",
                movies: movies,
            });
        } catch (err) {
            next(err);
        }
    },

    add: async (req, res, next) => {
        if (req.file) {
            req.body.poster = req.file.filename;
            const mappedMovie = map_movie_request(req.body);
            let genres = [];
            try {
                const movie = await db.Movie.create(mappedMovie);

                if (req.body.genre) {
                    let reqGenres = req.body.genre;

                    //if only one genre is provided convert it to array
                    if (!isArray(reqGenres)) {
                        reqGenres = reqGenres.split();
                    }

                    //make object values for each genre to insert in db
                    const movie_genres = reqGenres.map((genre) => {
                        return {
                            movieId: movie.id,
                            genreId: parseInt(genre),
                        };
                    });

                    const genres = await db.MovieGenre.bulkCreate(movie_genres);
                }

                res.status(200).json({
                    movie: movie,
                    message: "movie inserted successfully",
                });
            } catch (err) {
                next(err);
            }
        } else {
            res.status(400).json({
                message: "poster required"
            });
        }
    },

    getById: async (req, res, next) => {
        try {
            const movie = await db.Movie.findByPk(req.params.id);

            if (!movie) {
                res.status(404).json({
                    message: "movie not found",
                });
                return;
            }
            res.status(200).json({
                movie: movie,
            });
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const movie = await db.Movie.findByPk(req.params.id);

            if (!movie) {
                res.status(404).json({
                    message: "movie not found",
                });
                return;
            }

            if (req.file) {
                req.body.poster = req.file.filename;
            }

            const mappedMovie = map_movie_request(req.body);

            const movieRowAffected = await db.Movie.update(mappedMovie, {
                where: {
                    id: movie.id,
                },
            });

            let genreRowAffected = false;

            if (req.body.genre) {
                const genres = req.body.genre;

                const movie_genres = genres.map((genre) => {
                    return {
                        movieId: movie.id,
                        genreId: parseInt(genre),
                    };
                });

                genreRowAffected = await db.MovieGenre.bulkCreate(movie_genres, {
                    updateOnDuplicate: ["movieId", "genreId"],
                });
            }

            if (movieRowAffected == 0 && !genreRowAffected) {
                res.status(400).json({
                    message: "movie update failed",
                });
                return;
            }

            const updatedMovie = await db.Movie.findByPk(movie.id);

            res.status(200).json({
                movie: updatedMovie
            });
        } catch (err) {
            next(err);
        }
    },

    remove: async (req, res, next) => {
        try {
            const movie = await db.Movie.findByPk(req.params.id);

            if (!movie) {
                res.status(404).json({
                    message: "movie not found",
                });
                return;
            }

            const deleted = await db.Movie.destroy({
                where: {
                    id: movie.id,
                },
            });

            if (!deleted) {
                res.status(400).json({
                    message: "movie deletion failed",
                });
                return;
            }

            const posterPath = __dirname + "./../uploads/images/" + movie.poster;
            await fsp.unlink(posterPath);

            res.status(200).json({
                message: "movie deleted successfully",
            });
        } catch (err) {
            next(err);
        }
    },

    listReviews: async (req, res, next) => {
        try {
            const movieReviews = await db.Review.findAll({
                where: {
                    movieId: req.params.id,
                },
            });

            if (!movieReviews) {
                res.status(404).json("movie reviews not found");
                return;
            }

            res.status(200).json({
                reviews: movieReviews
            });
        } catch (err) {
            next(err);
        }
    },

    listGenres: async (req, res, next) => {
        try {
            const movieGenres = await db.MovieGenre.findAll({
                where: {
                    movieId: req.params.id
                },
                attributes: ['genreId']
            });

            res.status(200).json({
                genres: movieGenres
            });
        } catch (err) {
            throw err;
        }
    }
};