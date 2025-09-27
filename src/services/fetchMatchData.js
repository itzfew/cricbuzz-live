const cheerio = require('cheerio');
const axios = require('axios');

const { InternalServer } = require('../core/response/errorResponse');
const CRICBUZZ_URL = "https://www.cricbuzz.com"

const fetchScore = async (matchId) => {
    try {
        const response = await axios.get(`${CRICBUZZ_URL}/live-cricket-scores/${matchId}`);
        const $ = cheerio.load(response.data);

        const minInf = $('.cb-min-inf');

        const update = $('.cb-text-stumps').text().trim() || $('.cb-text-complete').text().trim() || $('.cb-text-inprogress').text().trim() || $('.cb-col.cb-col-100.cb-font-18.cb-toss-sts.cb-text-abandon').text().trim() || $('.cb-text-lunch').text().trim() || $('.cb-text-inningsbreak').text().trim() || $('.cb-text-tea').text().trim() || $('.cb-text-rain').text().trim() || $('.cb-text-wetoutfield').text().trim() || 'Match Stats will Update Soon';

        // Extract commentary: Last 10 non-empty lines from .cb-com-ln elements within commentary section
        const commSection = $('.cb-comm-pg');
        const allCommentary = commSection.find('.cb-com-ln').map((i, el) => $(el).text().trim()).get();
        const commentary = allCommentary.slice(-10).filter(text => text.length > 0 && !text.includes('Stats by') && !text.includes('Local Time'));

        return {
            'title': $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim().replace(', Commentary', ''),
            'update': update,
            'liveScore': $('.cb-min-bat-rw .cb-font-20.text-bold').text().trim(),
            'runRate': $('.cb-min-bat-rw .cb-font-12.cb-text-gray').text().trim().replace(/.*CRR:\s*/, ''),
            'batsmanOne': minInf.find('.cb-min-itm-rw').eq(0).find('.cb-col.cb-col-50').text().trim(),
            'batsmanOneRun': minInf.find('.cb-min-itm-rw').eq(0).find('.cb-col').eq(1).text().trim(),
            'batsmanOneBall': '(' + minInf.find('.cb-min-itm-rw').eq(0).find('.cb-col').eq(2).text().trim() + ')',
            'batsmanOneSR': minInf.find('.cb-min-itm-rw').eq(0).find('.cb-col').eq(5).text().trim(),
            'batsmanTwo': minInf.find('.cb-min-itm-rw').eq(1).find('.cb-col.cb-col-50').text().trim(),
            'batsmanTwoRun': minInf.find('.cb-min-itm-rw').eq(1).find('.cb-col').eq(1).text().trim(),
            'batsmanTwoBall': '(' + minInf.find('.cb-min-itm-rw').eq(1).find('.cb-col').eq(2).text().trim() + ')',
            'batsmanTwoSR': minInf.find('.cb-min-itm-rw').eq(1).find('.cb-col').eq(5).text().trim(),
            'bowlerOne': minInf.find('.cb-min-itm-rw').eq(2).find('.cb-col.cb-col-50').text().trim(),
            'bowlerOneOver': minInf.find('.cb-min-itm-rw').eq(2).find('.cb-col').eq(1).text().trim(),
            'bowlerOneRun': minInf.find('.cb-min-itm-rw').eq(2).find('.cb-col').eq(3).text().trim(),
            'bowlerOneWickets': minInf.find('.cb-min-itm-rw').eq(2).find('.cb-col').eq(4).text().trim(),
            'bowlerOneEconomy': minInf.find('.cb-min-itm-rw').eq(2).find('.cb-col').eq(5).text().trim(),
            'bowlerTwo': minInf.find('.cb-min-itm-rw').eq(3).find('.cb-col.cb-col-50').text().trim(),
            'bowlerTwoOver': minInf.find('.cb-min-itm-rw').eq(3).find('.cb-col').eq(1).text().trim(),
            'bowlerTwoRun': minInf.find('.cb-min-itm-rw').eq(3).find('.cb-col').eq(3).text().trim(),
            'bowlerTwoWicket': minInf.find('.cb-min-itm-rw').eq(3).find('.cb-col').eq(4).text().trim(),
            'bowlerTwoEconomy': minInf.find('.cb-min-itm-rw').eq(3).find('.cb-col').eq(5).text().trim(),
            'commentary': commentary.length > 0 ? commentary : ['No commentary available yet. Match may be pre-start or completed without updates.']
        }
    } catch (e) {
        throw new InternalServer("Something went wrong")
    }
}

const fetchMatches = async (endpoint, origin = "international") => {
    try {

        const URL = `${CRICBUZZ_URL}/cricket-match/${endpoint}`

        const response = await axios.get(URL);
        const $ = cheerio.load(response.data, { xmlMode: true });

        const matches = [];

        // Iterate through each match element of the active match type
        $(`.cb-plyr-tbody[ng-show="active_match_type == '${origin}-tab'"] .cb-col-100.cb-col`).each((index, matchElement) => {
            // Extract match details
            const titleElement = $(matchElement).find('.cb-lv-scr-mtch-hdr a');
            const title = titleElement.text().trim();

            // Check if titleElement has an href attribute
            const hrefAttribute = titleElement.attr('href');
            const matchId = hrefAttribute ? hrefAttribute.match(/\/(\d+)\//)[1] : null; // Extracting match ID from href if available


            const teams = [];
            $(matchElement).find('.cb-ovr-flo.cb-hmscg-tm-nm').each((i, teamElement) => {
                const teamName = $(teamElement).text().trim();
                const run = $(matchElement).find('.cb-ovr-flo').filter(':not(.cb-hmscg-tm-nm)').eq(i).text().trim();
                const sanitizeRun = run.replace(teamName, "");  // Fixed typo: senitize -> sanitize, split->replace

                const teamObject = {
                    team: teamName,
                    run: sanitizeRun,
                };

                teams.push(teamObject);
            });

            const timeAndPlaceElement = $(matchElement).find('div.text-gray');
            const date = timeAndPlaceElement.find('span').eq(0).text().trim();
            const time = timeAndPlaceElement.find('span').eq(2).text().trim();
            const place = timeAndPlaceElement.find('span.text-gray').text().trim();

            const overViewIfLive = $(matchElement).find(".cb-text-live").text().trim();
            const overViewIfComplete = $(matchElement).find(".cb-text-complete").text().trim();

            // Create an object for the match
            const matchObject = {
                id: matchId,
                title,
                teams,
                timeAndPlace: {
                    date,
                    time,
                    place,
                },
                overview: overViewIfLive || overViewIfComplete
            };



            // Categorize matches based on type
            if (matchId && title.length) {
                const matchIdExist = matches.filter(match => match.id === matchId);
                if (!matchIdExist.length) {
                    matches.push(matchObject)
                }
            }
        });


        return {
            matches
        }
    } catch (error) {
        throw new InternalServer(error.message)
    }
}

module.exports = {
    fetchScore,
    fetchMatches
}
