let express = require('express');
let router = express.Router();
const phantom = require('phantom')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios')
async function getKeyRootKeyWord(keyword) {
    let keywords = []
    let url = `https://completion.amazon.com/api/2017/suggestions?page-type=Gateway&lop=en_US&site-variant=desktop&mid=ATVPDKIKX0DER&alias=aps&b2b=0&fresh=0&ks=65&prefix=${encodeURI(keyword)}&suggestion-type=keyword`
    await axios.get(url).then(response => {

        let suggestions = response.data.suggestions
        suggestions.forEach(item => {
            keywords.push(item.value)
        })
    }).catch(err => {
        console.log(err)
    })
    return keywords
}
async function getAsin(keyword) {
    // https://www.amazon.com/s/keywords=shoes&ie=UTF8&qid=1545979996&lo=none
    let url = `https://www.amazon.com/s/keywords=${encodeURI(keyword)}&ie=UTF8&qid=1545979996&lo=none`
    // let url = 'https://www.amazon.com/s/keywords=shoes&ie=UTF8&qid=1545979996&lo=none'
    let keywords = []
    await phantom.create(['--ignore-ssl-errors=yes','--load-images=yes']).then(async function(ph) {
        await ph.createPage().then(async function(page) {
            await page.on('onConsoleMessage',  async function(msg, lineNum, sourceId) {
                console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
            });
            await page.open(url)
            await timeout(5000)
            await page.render('amazon.jpg')
            keywords = await page.evaluate(function () {
                var uls = document.getElementById('s-results-list-atf')
                var lis = uls.querySelectorAll('li.s-result-item')
                var keywords = []
                for(var i = 0 ; i < lis.length; i++)
                {
                    keywords.push(lis[i].getAttribute('data-asin'))
                }
                return keywords
            });
        })
    });
    return keywords

}
async function getKeyWordSearch(keywords) {
    let results = []
    await phantom.create(['--ignore-ssl-errors=yes','--load-images=no']).then(async function(ph) {
        await ph.createPage().then(async function(page) {
            page.property('viewportSize', {width: 1280 , height: 1024})
            // await page.on('onConsoleMessage',  async function(msg, lineNum, sourceId) {
            //     console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
            // });
            //login
            await page.open('https://www.merchantwords.com/login')
            await timeout(3000)
            await page.evaluate(function () {
                document.getElementById('field-email-3#').value = 'truclinh@imgroup.vn'
                document.getElementById('field-pass-3#').value = 'Linh1993!@#'
                document.getElementById('submitButton').click()
            })
            await timeout(3000)
            console.log('login thanh cong')
            await page.render('merchantwords.jpg')
            for (let i = 0 ; i < keywords.length; i ++)
            {
                var url = `https://www.merchantwords.com/search/us/${encodeURI(keywords[i])}/sort-highest`
                console.log('dang lay tu khoa',keywords[i])
                await page.open(url)
                await timeout(3000)
                await page.render(`merchantwords_search_${keywords[i]}.jpg`)
                results.push(await page.evaluate(function () {
                    var result = []
                    var table = document.querySelector('table.responsive')
                    var tbody = table.querySelector('tbody')
                    var trs = tbody.querySelectorAll('tr')
                    for(var i = 1 ; i < trs.length ; i++)
                    {
                        var  tds = trs[i].querySelectorAll('td')
                        result.push({
                            "amazon_search_terms" : tds[0].innerText,
                            "search_rank" : tds[2].innerText,
                            "review_on_page" : tds[3].innerText,
                            "results" : tds[4].innerText
                        })
                    }
                    return result
                }))
                // https://www.merchantwords.com/search/us/B00E68O4JU/sort-highest
            }
        })
    });
    console.log(results)
    return results
}
router.get('/',async function (req,res) {
    let keyword = req.query.keyword
    if(keyword == null || keyword == undefined || keyword == '')
    {
        return res.status(503).json({
            message: 'err'
        })
    }
    let keywords = await getKeyRootKeyWord(keyword)
    console.log('tu goi y',keywords)
    let asinKeywords = await getAsin(keyword)
    getKeyWordSearch(asinKeywords)
    return res.json(
        {
            keywords: 'ok'
        }
    )
})
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = router;
