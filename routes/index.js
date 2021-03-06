let express = require('express');
let router = express.Router();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios')
const fs = require('fs')
const helper = require('../helpers/helper')
const tokenSearch = '8ifOh3JKYCNg01I2K0PI'
const tokenStop = 'vmWRXUKQA6xZZYTCdXsY'
const tokenPage = 'N89B8uyqZd4c9icGslTe'
const tokenPut = '4PyLWsy0jGGLpaON92fI'
const tokenDone = 'n10JJg7XfBc4XWdbt9lw'
const timeNextPage = 60000
const timeBlock = 600000
const timeGetProduct = 10000
const serverPHP = 'http://13.59.122.59'
const TOKEN = 'KYKOFOCJUMJZZZOK'
const Contact = require('../model/contact')
// const serverPHP = 'http://localhost:8000'
const SearchKeyword = require('./../model/searches')

const colorMap = ["Beige","Black","Blue","Bronze","Brown","Clear","Copper","Cream","Gold","Green","Grey","Metallic","Multi-colored","Orange","Pink","Purple","Red","Silver","White","Yellow"]
const sizeMap = ["L","M","S","XL","XS","XXL","XXS"]

router.get('/',function(req,res,next){
    getInfoProductApi('32826897725')
    return res.send(
        'ok'
    )
})

router.get('/stop-search',function (req,res) {
    let token = req.query.token
    if(token != tokenStop)
    {
        return false
    }
    let keyword_id = req.query.keyword_id
    SearchKeyword.deleteOne({id: keyword_id},function(err){
        if(err)
        {
            return res.status(500).json(err)
        }
        else{
            console.log('da dung tien trinh thanh cong')
            return res.json({
                "message": "Dừng tiến trình thành công"
            })
        }
    })
})

router.get('/search',function(req,res,next){
    let query = req.query.query
    query = query.replace(/%20/g,'+')
    query = query.replace(/ /g,'+')
    let multiplication = parseFloat(req.query.multiplication)
    if(multiplication < 2.5)
    {
        multiplication = 2.5
    }
    let page = req.query.page
    let token = req.query.token
    if(token != tokenSearch)
    {
        return false
    }
    let keyword_id = parseInt(req.query.keyword_id)
    if(!isNaN(page))
    {
        let url = `https://www.aliexpress.com/wholesale?isPremium=y&SearchText=${query}&page=${page}`
        if(req.query.url != undefined && req.query.url != "")
        {
            url = req.query.url
        }
        if(req.query.start != undefined)
        {
            let searchKeyword = new SearchKeyword({
                id : keyword_id,
                block: 0
            })
            searchKeyword.save(async function (err) {
                if(err)
                {
                    console.log(err)
                    return res.status(500).json(err)
                }
                else{
                    await searchProduct(url,multiplication,query,keyword_id,page)
                }
            })

        }

    }
    return res.json({
        auth: "reject"
    })
})

async function searchProduct(url,multiplication,search,keyword_id,page) {
    if(page < 1)
    {
        return false
    }
    SearchKeyword.findOne({id: keyword_id},['id','block'], async function (err,keywordSearch) {
        if(err || keywordSearch == null)
        {
            console.log('Co loi hoac tu khoa khong ton tai ')
        }
        else{
            axios.get(serverPHP+'/keywords/'+keyword_id+'/page/'+page+'?token='+tokenPage).then(data => {
                console.log('page: ',page)
            }).catch(err => {
                console.log(err)
                console.log('Khong the ket noi den server')
            })
            if(keywordSearch.block > 2)
            {
                console.log('da bi chan qua 3 lan')
            }
            else{
                await axios.get(url).then(async response => {
                    const { window } = new JSDOM(response.data);
                    const $ = require('jquery')(window);
                    let products = $('.pic')
                    if(products.length == 0 || products.length == undefined)
                    {
                        console.log('Dang bi chan - Vui long doi 10 phut')
                        searchProduct.block++
                        searchProduct.save(function(err){
                            if(err)
                            {
                                console.log(err)
                            }else{
                                setTimeout(async function () {
                                    await searchProduct(url,multiplication,search,keyword_id,parseInt(page))
                                },timeBlock)
                            }
                        })
                    }
                    else {
                        for(let i = 0 ;i < products.length ; i++)
                        {
                            let url = $(products[i]).find('a.picRind:eq(0)')
                            if(url.length > 0)
                            {
                                url = $(url).attr('href')
                                url = url.split('/')

                                let item_sku = url.find(item => {
                                    return item.includes('.html')
                                })
                                let indexHtml = item_sku.indexOf('.html')
                                item_sku = item_sku.slice(0,indexHtml)

                                let checkEpacket = await checkEPacket(item_sku)

                                if(checkEpacket.result == true)
                                {
                                    await timeout(timeGetProduct)
                                    getInfoProduct(item_sku,checkEpacket.price,multiplication,keyword_id,search)
                                }
                            }
                        }
                        let aNext = $('a.page-next.ui-pagination-next:eq(0)')
                        if(aNext != null)
                        {
                            if($(aNext).attr('href') != undefined)
                            {
                                setTimeout(async function () {
                                    await searchProduct('https:'+$(aNext).attr('href'),multiplication,search,keyword_id,parseInt(page) + 1)
                                },timeNextPage)
                            }
                            else{
                                axios.get(serverPHP+'/keywords/done/'+keyword_id+'?token='+tokenDone).then(response => {
                                    console.log('da het trang')
                                }).catch(err => {
                                    console.log('Co loi request den server')
                                })
                                SearchKeyword.deleteOne({id : keyword_id},function (err) {
                                    if(err)
                                    {
                                        console.log(err+ '---dong 185')
                                    }
                                })
                            }
                        }
                        else{
                            axios.get(serverPHP+'/keywords/done/'+keyword_id+'?token='+tokenDone).then(response => {
                                console.log('da het trang')
                            }).catch(err => {
                                console.log('Co loi request den server')
                            })
                        }
                    }
                }).catch(err => {
                    console.log(err)
                    console.log('Loi request')
                })
            }

        }
    })
}

async function checkTradeMark(textBrandName){
    let trademark = false
    textBrandName = textBrandName.replace(/ /g,'%20')
    let url = 'https://www.trademarkia.com/trademarks-search.aspx?tn=' + textBrandName
    const $ = require('jquery')
    await axios.get(url).then(response => {
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let bodyTable = $(".table.tablesaw.tablesaw-stack").find("tbody")
        if( bodyTable.length > 0)
        {
            trademark = true
        }
    }).catch(err => {
        console.log(url)
        console.log(textBrandName,'Loi check trademark')
    })
    return trademark;
}

async function getDesc(url,brandName) {
    let des = []
    await axios.get(url).then(response => {
        const { window } = new JSDOM('<div id="app-des-content">'+response.data+'</div>');
        const $ = require('jquery')(window);
        let text = $('#app-des-content').text()
        text = text.replace(/\t/g,'\n')
        text = text.trim().split('\n').filter(item => {
            return item.replace(/\s/g, '').length > 0
        })
        text = text.map(item => {
            item = item.trim()
            item = item.replace(/\\/g,'')
            return item
        })
        text = text.filter(item => {
            return !item.includes('$') && !item.includes(brandName) && !item.includes('Aliexpress')
        })
        des = text
    }).catch(err => {
        console.log('Loi lay mo ta san pham')
    })
    let result = ""
    if(des.length > 0)
    {
        des.forEach(item => {
            if((result + '<p>'+item+'</p>').length < 2000)
            {

                result += '<p>'+item+'</p>'
            }
        })
        if(result == "")
        {
            result = '<p>'
            des.forEach(item => {
                for(let i = 0 ; i < item.length ; i ++)
                {
                    if((result + item[i]).length < 1990)
                    {
                        result+=item[i]
                    }
                }
            })
            result+='</p>'
        }
    }

    return result
}

async function checkEPacket(item_sku) {
    let result = {
        result: false,
        price : -1,
        max_date: 40,
        min_date: 35
    }
    await axios.get(`https://freight.aliexpress.com/ajaxFreightCalculateService.htm?productid=${item_sku}&country=US&abVersion=1`).then(response => {
        let ships = JSON.parse(response.data.replace('(','').replace(')',''))

        if(ships.freight != undefined)
        {
            let price = 50
            ships.freight.forEach(i => {
                let maxDate = i.time.split('-')

                if(maxDate.length > 1)
                {
                    maxDate = maxDate[1]
                    if(/*(i.isTracked == true && parseInt(maxDate) < 40 && (i.localPrice < result.price || result.price == -1)) || */i.companyDisplayName == "ePacket")
                    {
                        result.result = true
                        result.price = i.localPrice
                        result.commitDay = i.commitDay
                    }
                }

            })
        }
        else{
            result = {
                result: false,
                price : -1
            }
            ships.forEach(i => {
                let maxDate = i.time.split('-')
                if(maxDate.length > 1)
                {
                    maxDate = maxDate[1]
                    if(/*(i.isTracked == true && parseInt(maxDate) < 40 && (i.localPrice < result.price || result.price == -1)) ||*/ i.companyDisplayName == "ePacket")
                    {
                        result.result = true
                        result.price = i.localPrice
                        result.commitDay = i.commitDay
                    }
                }
            })
        }
    }).catch(err => {
        console.log('loi check e packet')
    })
    return result
}

function getSpecifics($){
    let specifics = $('.product-property-list:eq(0)').html()
    let outer_material_types = $('.product-property-list:eq(0)').find('span:contains(Material):eq(0)').next('span').text()


    let specificsLis = $('.product-property-list:eq(0)').find('li:not(:contains(Brand Name))')
    let specificsLisText = []
    if(specificsLis.length > 0)
    {
        for(let ii = 0 ;ii < specificsLis.length ; ii++)
        {
            specificsLisText.push($(specificsLis[ii]).text().trim())
        }
    }
    specificsLisText = specificsLisText.map(item => {
        item = item.replace(/\n/g,'')
        item = item.replace(/\s\s/g,'')
        item = item.trim()
        return item
    })
    let bulletpoints = {

    }
    let allText = specificsLisText.join(' * ')
    let stop = parseInt(allText.length / 5) - 1
    let jB = 0
    for(let i = 1 ;i <= 5 ; i++)
    {
        let str = ''
        for(let  j = jB ; j < specificsLisText.length ; j++)
        {

            if((str + specificsLisText[j]).length < stop)
            {
                str+=specificsLisText[j]+', '

            }
            else{
                jB = j
                bulletpoints['bullet_point'+(i)] = str
                break
            }
        }
    }
    return {
        specifics: '<p>'+specificsLisText.join('</p><p>')+'</p>',
        bulletpoints: bulletpoints
    }
}

function getColors($,price,des,parent_sku,main_image_url){
    $.expr[':'].contains = function(a, i, m) {
        return $(a).text().toUpperCase()
            .indexOf(m[3].toUpperCase()) >= 0;
    };
    let infoColorAndSizeProduct = $('#j-product-info-sku')
    let liColors = $(infoColorAndSizeProduct).find('dt:contains(color):eq(0)').next('dd').find('li')
    let liSizes = $(infoColorAndSizeProduct).find('dt:contains(size):eq(0)').next('dd').find('li')
    let colors = [];
    let sizes = [];
    let images_colors = '';

    for(let i = 0;i< liColors.length;i++)
    {
        if($(liColors[i]).children('a:eq(0)').attr('title') == undefined)
        {
            sizes.push($(liColors[i]).children('a:eq(0)').children('span:eq(0)').html())
        }
        else{
            let color = $(liColors[i]).children('a:eq(0)').attr('title')
            let src = $(liColors[i]).children('a:eq(0)').find('img:eq(0)').attr('src');
            if(src != undefined)
            {
                let image = src.replace('_50x50.jpg','')
                image = src.replace('_50x50.jpeg','')
                colors.push({
                    color: color,
                    image: image
                })
            }
            else{
                sizes.push(color)
            }
        }
    }
    for(let i = 0;i< liSizes.length;i++)
    {
        let s = $(liSizes[i]).children('a:eq(0)').children('span:eq(0)').html()
        if(s != undefined)
        {
            sizes.push($(liSizes[i]).children('a:eq(0)').children('span:eq(0)').html())
        }

    }

    let data = []

    if(colors.length > 0)
    {
        if(sizes.length > 0)
        {
            for(let i = 0 ;i < colors.length; i++)
            {
                for(let j = 0 ; j < sizes.length ; j++)
                {
                    let keys = Object.keys(price)
                    keys.forEach(key => {
                        if(colors[i].color +','+sizes[j] == key)
                        {
                            let color = colors[i].color

                            color = color.toLowerCase()
                            color = color.split(' ')
                            let color_map = 'White'
                            for(let i = 0 ; i< color.length ; i++)
                            {
                                if(colorMap.includes(color[i]))
                                {
                                    color_map = colorMap.find(item => {
                                        return item == color[i]
                                    })
                                    break;
                                }
                            }
                            let size_name = sizes[j]
                            size_name=size_name.toLowerCase()

                            let size_map = "L"

                            size_name = size_name.split(' ')
                            for(let i = 0 ; i< size_name.length ; i++)
                            {
                                if(sizeMap.includes(size_name[i]))
                                {
                                    size_map = sizeMap.find(item => {
                                        return item == size_name[i]
                                    })
                                    break;
                                }
                            }

                            let swatch_image_url = colors[i].image
                            if(swatch_image_url.includes('.jpg'))
                            {
                                swatch_image_url = swatch_image_url+'_50x50.jpg'
                            }
                            else if(swatch_image_url.includes('.jpeg'))
                            {
                                swatch_image_url = swatch_image_url+'_50x50.jpeg'
                            }
                            let main_image_url = colors[i].image
                            main_image_url = main_image_url.replace('_50x50.jpg','')
                            main_image_url = main_image_url.replace('_50x50.jpeg','')
                            data.push({
                                color_name: colors[i].color,
                                size_name: sizes[j],
                                main_image_url: main_image_url,
                                standard_price: price[key],
                                product_description: des,
                                parent_child: 'Child',
                                relationship_type: 'variation',
                                variation_theme: 'SizeNameColorName',
                                parent_sku: parent_sku,
                                item_sku: parent_sku+'-cl'+(i+1)+'-size'+(j + 1),
                                swatch_image_url: swatch_image_url,
                                color_map: color_map,
                                size_map: size_map
                            })
                        }
                    })
                }

            }

        }
        else{

            for(let i = 0 ;i < colors.length; i++)
            {
                let keys = Object.keys(price)

                for(let j= 0 ; j < keys.length ; j++)
                {
                    if(colors[i].color == keys[j])
                    {
                        let color = colors[i].color

                        color = color.toLowerCase()
                        color = color.split(' ')
                        let color_map = 'White'
                        for(let i = 0 ; i< color.length ; i++)
                        {
                            if(colorMap.includes(color[i]))
                            {
                                color_map = colorMap.find(item => {
                                    return item == color[i]
                                })
                                break;
                            }
                        }
                        let main_image_url1 = colors[i].image

                        //todo Loi hinh anh
                        if(main_image_url1 != undefined)
                        {
                            main_image_url = main_image_url1.replace('_50x50.jpg','')
                            main_image_url = main_image_url.replace('_50x50.jpeg','')

                        }
                        data.push({
                            color_name: colors[i].color,
                            main_image_url: main_image_url,
                            standard_price: price[keys[j]],
                            product_description: des,
                            parent_child: 'Child',
                            relationship_type: 'variation',
                            variation_theme: 'ColorName',
                            parent_sku: parent_sku,
                            item_sku: parent_sku+'-cl'+(i+1),
                            swatch_image_url: colors[i].image+'_50x50.jpg',
                            color_map: color_map
                        })
                        break;

                    }
                }

            }
        }
    }
    else if (sizes.length > 0)
    {
        for(let j = 0 ; j < sizes.length ; j++)
        {
            let keys = Object.keys(price)
            keys.forEach(key => {
                if(sizes[j] == key)
                {
                    let size_name = sizes[j]
                    size_name=size_name.toLowerCase()

                    let size_map = "L"

                    size_name = size_name.split(' ')
                    for(let i = 0 ; i< size_name.length ; i++)
                    {
                        if(sizeMap.includes(size_name[i]))
                        {
                            size_map = sizeMap.find(item => {
                                return item == size_name[i]
                            })
                            break;
                        }
                    }

                    //todo Loi hinh anh
                    if(main_image_url != undefined)
                    {
                        main_image_url = main_image_url.replace('_50x50.jpg','')
                        main_image_url = main_image_url.replace('_50x50.jpeg','')
                        data.push({
                            size_name: sizes[j],
                            standard_price: price[key],
                            product_description: des,
                            parent_child: 'Child',
                            relationship_type: 'variation',
                            variation_theme: 'SizeName',
                            parent_sku: parent_sku,
                            item_sku: parent_sku+'-size'+(j+1),
                            main_image_url: main_image_url,
                            size_map: size_map
                        })
                    }
                    else{
                        console.log('error: ', parent_sku)
                    }

                }
            })
        }
    }
    return data
}

function getImage($){
    let other_images = ''
    let main_image = ''
    let data = {

    }
    let imagesProduct = $('#j-image-thumb-list>li>span>img')
    for (let i = 0;i< imagesProduct.length;i++)
    {
        if(i == 0)
        {
            main_image = $(imagesProduct[i]).attr('src')
            main_image = main_image.replace('_50x50.jpg','')
            data['main_image_url'] = main_image
        }else{
            other_images = ($(imagesProduct[i]).attr('src')).replace('_50x50.jpg','')
            other_images = other_images.replace('_50x50.jpeg','')
            data['other_image_url'+(i)] = other_images
        }
    }
    return data
}

async function getInfoProduct(item_sku,price_ship,multiplication,keyword_id,search){
    SearchKeyword.findOne({id : keyword_id},['id','block'], async function (err,doc) {
        if(err || doc == null)
        {
            console.log('Co loi xay ra hoac tu khoa khong ton tai')
        }
        else{
            console.log('Dang lay thong tin san pham: ',item_sku)
            let info = []
            await axios.get(`https://www.aliexpress.com/item/a/${item_sku}.html`).then(async response => {
                const { window } = new JSDOM(response.data);
                const $ = require('jquery')(window);
                const textSkuProducts = $('script:contains(skuProducts)').text()
                let index = textSkuProducts.indexOf('skuProducts')
                let context = textSkuProducts.slice(index)
                index = context.indexOf('];')
                context = context.slice(0,index)
                context+=']'
                context = context.replace('skuProducts=','')
                let skuProducts = JSON.parse(context)
                let textDetailDesc = $('script:contains(window.runParams.detailDesc)').text()
                index = textDetailDesc.indexOf('window.runParams.detailDesc')
                context = textDetailDesc.slice(index)
                context = context.replace('window.runParams.detailDesc="','')
                index = context.indexOf('"')
                context = context.slice(0,index)


                let urlGetDes = context
                //check thuong hieu
                let branchName =  $('.product-property-list:eq(0)').find('li:contains(Brand Name)')
                if(branchName.length > 0)
                {
                    branchName = branchName[0]
                }
                var brandName = $(branchName).find('span:eq(1)').text()

                // let tradeMark = await checkTradeMark(encodeURI(brandName))

                let item_name = $('h1.product-name:eq(0)').text().replace(new RegExp(brandName,'i'),'')

                let image_data = getImage($)

                let des = await getDesc(urlGetDes,brandName)
                let specifics_bulletpoints = getSpecifics($)
                if((des.toString().length+specifics_bulletpoints.specifics.toString().length) < 2000)
                {
                    des +=specifics_bulletpoints.specifics
                }
                let products = []

                let price_data  = helper.getPrice($,skuProducts,price_ship,multiplication)
                let generic_keywords = await getRootKeyWord(item_name,item_sku,search)
                if(Object.keys(price_data).length === 0)
                {
                    // khong co bien the

                    let price = (parseInt($('#j-sku-discount-price').text()) + parseInt(price_ship)) * multiplication + 1.99
                    let product = {
                        item_sku:"",
                        item_name:"",
                        standard_price:"",
                        main_image_url:"",
                        swatch_image_url:"",
                        other_image_url1:"",
                        other_image_url2:"",
                        other_image_url3:"",
                        other_image_url4:"",
                        other_image_url5:"",
                        other_image_url6:"",
                        other_image_url7:"",
                        other_image_url8:"",
                        other_image_url9:"",
                        other_image_url10:"",
                        parent_child:"",
                        relationship_type:"",
                        parent_sku:"",
                        variation_theme:"",
                        product_description:"",
                        bullet_point1:"",
                        bullet_point2:"",
                        bullet_point3:"",
                        bullet_point4:"",
                        bullet_point5:"",
                        color_name:"",
                        color_map:"",
                        size_name:"",
                        size_map:"",
                        keyword_id: keyword_id,
                        generic_keywords: generic_keywords
                    }
                    product = updateInfoProduct(product,image_data)
                    product = updateInfoProduct(product,specifics_bulletpoints.bulletpoints)
                    product.product_description = des
                    product.item_sku = item_sku
                    product.item_name = item_name
                    product.standard_price = price
                    products.push(product)
                    putToServer(products)
                }
                else{
                    let main_image_url = image_data.main_image_url
                    let product_child = getColors($,price_data,des,item_sku,main_image_url)
                    if(product_child.length > 0)
                    {
                        let product = {
                            item_sku:"",
                            item_name:"",
                            standard_price:"",
                            main_image_url:"",
                            swatch_image_url:"",
                            other_image_url1:"",
                            other_image_url2:"",
                            other_image_url3:"",
                            other_image_url4:"",
                            other_image_url5:"",
                            other_image_url6:"",
                            other_image_url7:"",
                            other_image_url8:"",
                            other_image_url9:"",
                            other_image_url10:"",
                            parent_child:"",
                            relationship_type:"",
                            parent_sku:"",
                            variation_theme:"",
                            product_description:"",
                            bullet_point1:"",
                            bullet_point2:"",
                            bullet_point3:"",
                            bullet_point4:"",
                            bullet_point5:"",
                            color_name:"",
                            color_map:"",
                            size_name:"",
                            size_map:"",
                            keyword_id: keyword_id,
                            generic_keywords: generic_keywords
                        }
                        product = updateInfoProduct(product,image_data)
                        product =  updateInfoProduct(product,specifics_bulletpoints.bulletpoints)
                        product.product_description = des
                        product.item_sku = item_sku
                        product.item_name = item_name
                        product.parent_child = "Parent"
                        product.relationship_type = ""
                        product.variation_theme = product_child[0].variation_theme == undefined ? "" :  product_child[0].variation_theme
                        products.push(product)
                        if(product_child.length > 0)
                        {
                            product_child.forEach(item => {
                                let temp = {
                                    item_sku:"",
                                    item_name:"",
                                    standard_price:"",
                                    main_image_url:"",
                                    swatch_image_url:"",
                                    other_image_url1:"",
                                    other_image_url2:"",
                                    other_image_url3:"",
                                    other_image_url4:"",
                                    other_image_url5:"",
                                    other_image_url6:"",
                                    other_image_url7:"",
                                    other_image_url8:"",
                                    other_image_url9:"",
                                    other_image_url10:"",
                                    parent_child:"",
                                    relationship_type:"",
                                    parent_sku:"",
                                    variation_theme:"",
                                    product_description:"",
                                    bullet_point1:"",
                                    bullet_point2:"",
                                    bullet_point3:"",
                                    bullet_point4:"",
                                    bullet_point5:"",
                                    color_name:"",
                                    color_map:"",
                                    size_name:"",
                                    size_map:"",
                                    keyword_id: keyword_id,
                                    generic_keywords: generic_keywords
                                }
                                temp =  updateInfoProduct(temp,image_data)
                                temp = updateInfoProduct(temp,specifics_bulletpoints.bulletpoints)
                                temp.product_description = des
                                temp.item_sku = item.item_sku
                                temp.item_name = item_name
                                temp.standard_price = item.standard_price
                                temp = updateInfoProduct(temp,item)
                                products.push(temp)
                            })
                        }
                        putToServer(products)
                    }
                }
            }).catch(err => {

                console.log(err)
                console.log('loi lay thong tin san pham')
            })
        }
    })
}

function updateInfoProduct(product,info) {
    let keys = Object.keys(product)
    keys.forEach(key => {
        if(info[key] != undefined)
        {
            product[key] = info[key]
        }
    })
    return product
}

function putToServer(data) {
    axios.put(serverPHP+'/api/product-aliexpress',{
        data:data,
        token: tokenPut
    }).then(response => {
        console.log(response.data)
    }).catch(err => {
        console.log(err)
        console.log('Loi tu server')
    })
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getInfoProductApi(productId) {
    axios.post(API_URL+'/v1/products/details',{
        productId: productId,
        currency: 'USD',
        locale: 'en_US'
    },
        {
            headers:{
                "X-Api-Client-Id" : 'KYKOFOCJUMJZZZOK',
            }
        }
        ).then(async data => {
        let infoProduct = data.data
        // kiem tra co bien the khong
        if(infoProduct.skuProperties.length == 0)
        {
            let product = {

            }
            product.standard_price = infoProduct.prices[0].maxAmount.value
            product.item_name = infoProduct.title
            for(let i = 1 ; i <= 10 ; i++)
            {
                let other_image = infoProduct.productImages[i - 1]
                if(other_image != undefined)
                {
                    product['other_image_url'+i] = other_image
                }
                else{
                    product['other_image_url'+i] = null
                }
            }

            // khong co bien the
        }
        else{
            //mau - kich cỡ
            // lay tat ca cac mau
            // lay tat ca cac size
            // sau do noi thanh chuoi
            let variations = await getVariationApi(productId)
            if(variations == null)
            {
                console.log('loi lay variations san pham',productId)
                return false
            }
            let colors = infoProduct.skuProperties.find(item => {
                return item.propertyId == 14
            })
            let sizes = infoProduct.skuProperties.find(item => {
                return item.propertyId == 5
            })
            let colors_sizes = []
            if(colors.values.length > 0 )
            {

                if(sizes.values.length > 0)
                {
                    colors.values.forEach(color => {
                        sizes.values.forEach(size => {
                            colors_sizes.push([
                                color.propertyValueId,size.propertyValueId
                                ])
                        })
                    })
                    // lay duoc gia va ten tung valiation
                    let result = []
                    let products_variation = []
                    colors_sizes.forEach(color_size => {
                        variations.forEach(item => {
                            if(item.stock > 0)
                            {
                                if(checkHasVariation(item,color_size))
                                {
                                    // ten
                                    // gia
                                    let product = {

                                    }
                                    let color_name = colors.values.find(color => {
                                        return color.propertyValueId == color_size[0]
                                    })
                                    color_name = color_name.propertyValueDisplayName

                                    let size_name = sizes.values.find(size => {
                                        return size.propertyValueId == color_size[1]
                                    })
                                    size_name = size_name.propertyValueDisplayName
                                    console.log(size_name,color_name)
                                    product.size_name = size_name
                                    product.color_name = color_name
                                    product.standard_price = item.price.value
                                    products_variation.push(product)
                                }
                            }
                        })
                    })
                    console.log(products_variation)
                }
                else{

                }
            }
            else if(sizes.values.length > 0)
            {

            }
        }
    }).catch(err => {
        console.log(err)
    })
}

function checkHasVariation(item_variation,color_size) {
    for(let i = 0 ; i < color_size.length ; i++)
    {
        if(!item_variation.propertyValueIds.includes(color_size[i]))
        {
            return false
        }
    }
    return true
}

async function getVariationApi(productId){
    let variation = null
    await axios.post(API_URL+'/v1/products/variations',{
            productId: productId,
            currency: 'USD',
            locale: 'en_US'
        },
        {
            headers:{
                "X-Api-Client-Id" : 'KYKOFOCJUMJZZZOK',
            }
        }
    ).then(data => {
        variation = data.data.variations
    }).catch(err => {
        console.log(err)
    })
    return variation
}

async function getSearchTemKey(productName,productId,rootKeyWord){
    return getRootKeyWord(productName,productId,rootKeyWord)
}

async function getKeyWordFromAmazon(queryKeyWord){
    let keywords = []
    for (let i = 0; i < queryKeyWord.length; i++) {
        let url = `https://completion.amazon.com/api/2017/suggestions?lop=en_US&site-variant=desktop&client-info=amazon-search-ui&mid=ATVPDKIKX0DER&alias=aps&b2b=0&fresh=0&ks=86&prefix=${encodeURI(queryKeyWord[i])}&suggestion-type=keyword&fb=1`
        await axios.get(url).then(response => {
            let suggestions = response.data.suggestions
            for (let i = 0; i < suggestions.length; i++) {
                keywords.push(suggestions[i].value)
            }
        }).catch(err => {
            console.log(err)
        })

    }
    let result = []
    keywords.forEach(item => {
        if(!result.includes(item))
        {
            result.push(item)
        }
    })
    let resultString = []
    result.forEach(item => {
        let tempItem = item.split(' ')
        tempItem.forEach(value => {
            // console.log(value)
            if(!resultString.includes(value) && value.length > 2)
            {
                resultString.push(value)
                if(resultString.join(' ').length > 245)
                {
                    resultString.pop()
                }
            }

        })

    })
    console.log(resultString.join(' '))
    return resultString.join(' ')
}
async function getRootKeyWord(productName,productId,rootKeyWord){
    let url = `https://www.aliexpress.com/seo/detailCrosslinkAjax.htm?productId=${productId}`
    let result  = []
    await axios.get(url).then(response => {
        response.data = `<div id="app-keyword">${response.data}</div>`
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let keyworks_a = $('#app-keyword').find('a')
        let check = [
        ]
        for(let i = 0 ;i <keyworks_a.length ; i++)
        {
            check.push($(keyworks_a[i]).text())
        }
        let txt = productName
        let keyword = rootKeyWord
        let txtRemove = ["Wholesale","Price","Promotion","the","of","by","a","an","on","in","from","to","for","&","-","_","are","is","was","were","&","!","@","#","$","%","^","*","(",")","ares"]

        check.forEach((item,index) => {
            let result = checkInRemove(item)
            if(result !== false)
            {
                check[index] = check[index].replace(result+" ","")
                check[index] = check[index].replace(" "+result,"")
                check[index] = check[index].replace(result,"")
            }
        })

        check = check.filter(function (item,index) {
            return index == check.findIndex((i) => {
                return i.toString() == item.toString()
            })
        })

        let checkData = []
        check.forEach(item => {
            item = item.split(" ")
            if(!item.includes(""))
            {
                checkData.push({
                    text: item,
                    score: 0
                })
            }

        })

        let txtArr = txt.split(" ")

        let keyworkArr = keyword.split(" ")


        txtArr.forEach(txt => {
            checkData.forEach((item,index) =>{
                item.text.forEach(i => {
                    if(i.toLowerCase() == txt.toLowerCase() && !txtRemove.includes(i) )
                    {
                        keyworkArr.forEach(txt1 => {
                            item.text.forEach(i => {
                                if(i.toLowerCase() == txt1.toLowerCase() && !txtRemove.includes(i) )
                                {
                                    checkData[index].score+=4
                                }
                                else{
                                    checkData[index].score+=2
                                }
                            })
                        })
                    }
                })

            })
        })
        keyworkArr.forEach(txt => {
            checkData.forEach((item,index) =>{
                item.text.forEach(i => {
                    if(i.toLowerCase() == txt.toLowerCase() && !txtRemove.includes(i) )
                    {
                        checkData[index].score+=1
                    }
                })

            })
        })
        checkData = checkData.map(item => {
            item.score = parseFloat(item.score / (item.text.length))
            return item
        })

        checkData.sort(function (a,b) {
            return b.score - a.score
        })

        for(let i = 0 ;i < checkData.length ; i++)
        {
            result.push(checkData[i].text.join(' '))
        }
    })
    return getKeyWordFromAmazon(result)
}
function checkInRemove(str) {
    let txtRemove = ["Wholesale","Price","Promotion"]
    for(let i = 0 ;i <txtRemove.length;i++)
    {
        if(str.includes(txtRemove[i]))
        {
            return txtRemove[i]
        }
    }

    return false
}

module.exports = router;
