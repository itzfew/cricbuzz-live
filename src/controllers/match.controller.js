// src/controllers/match.controller.js
const asyncHandler = require("express-async-handler");
const route = require('../routes/v1');
const HttpResponse = require('../core/response/httpResponse');
const { fetchScore, fetchCommentary, fetchMatches } = require("../services/fetchMatchData");

route.get(
    '/score/:matchId',
    asyncHandler(async function getMatches(req, res) {
        try {
            const { matchId } = req.params;
            const score = await fetchScore(matchId);
            const httpResponse = HttpResponse.get({ message: "Score data successfully retrieved", data: score });
            res.status(200).json(httpResponse);
        } catch (error) {
            console.error(error);
            throw error; // Let express-async-handler handle the error
        }
    })
);

route.get(
    '/commentary/:matchId',
    asyncHandler(async function getCommentary(req, res) {
        try {
            const { matchId } = req.params;
            const commentary = await fetchCommentary(matchId);
            const httpResponse = HttpResponse.get({ message: "Commentary data successfully retrieved", data: commentary });
            res.status(200).json(httpResponse);
        } catch (error) {
            console.error(error);
            throw error;
        }
    })
);

function createMatchesRoute(path, endpoint) {
    try {
        route.get(
            path,
            asyncHandler(async function getMatches(req, res) {
                const type = req.query.type || 'international';
                const matches = await fetchMatches(endpoint, type);
                const httpResponse = HttpResponse.get({ message: "Matches data successfully retrieved", data: matches });
                res.status(200).json(httpResponse);
            })
        );
    } catch (error) {
        console.error(error);
    }
}

createMatchesRoute('/matches/live', 'live-scores');
createMatchesRoute('/matches/recent', 'live-scores/recent-matches');
createMatchesRoute('/matches/upcoming', 'live-scores/upcoming-matches');

module.exports = route;
