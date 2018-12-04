let express = require('express');
let router = express.Router();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios')
const excel = require('node-excel-export');
var Product = require('../model/products')
var RootUrl = require('../model/root_url')
var BackList = require('../model/back_list')
const fs = require("fs");
const csv = require('fast-csv')
const vm = require('vm');
const helper = require('../helpers/helper')
const startProduct = 5
/* GET home page. */
router.get('/', function(req, res, next) {
    let item_sku = '32953605626'
    getInfoProduct(item_sku)
    res.send('ok')
});
router.get('/test',function(req,res,next){
    let query = req.query.query
    query = query.replace(/%20/g,'+')
    let url = `https://www.aliexpress.com/wholesale?site=glo&g=y&SearchText=${query}`
    searchProduct(url)
})



async function searchProduct(url)
{
    await axios.get(url).then(async response => {
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let products = $('.pic')
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
                if(checkEpacket == true)
                {
                    getInfoProduct(item_sku)
                }
            }
        }
        let aNext = $('a.page-next.ui-pagination-next:eq(0)')
        if(aNext != null)
        {
            if($(aNext).attr('href') != undefined)
            {
                setTimeout(function () {
                    searchProduct('https:'+$(aNext).attr('href'))
                })
            }
        }

    }).catch(err => {
        console.log(err)
    })
}


async function checkTradeMark(textBrandName){
    let trademark = false
    const $ = require('jquery')
    await axios.get(`https://www.trademarkia.com/trademarks-search.aspx?tn=${textBrandName}`).then(response => {
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);
        let bodyTable = $(".table.tablesaw.tablesaw-stack").find("tbody")
        if( bodyTable.length > 0)
        {
            trademark = true
        }
    }).catch(err => {
        console.log(err)
    })
    return trademark;
}


async function getDesc(url,brandName)
{
    let des = []
    await axios.get(url).then(response => {
        const { window } = new JSDOM('<div id="app-des-content">'+response.data+'</div>');
        const $ = require('jquery')(window);
        let text = $('#app-des-content').text()
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
        console.log(err)
    })

    return '<p>'+des.join('</p><p>')+'</p>'
}


async function checkEPacket(item_sku) {
    let result = false
    await axios.get(`https://freight.aliexpress.com/ajaxFreightCalculateService.htm?productid=${item_sku}&country=US&abVersion=1`).then(response => {
        let ships = JSON.parse(response.data.replace('(','').replace(')',''))
        if(ships.freight != undefined)
        {
            ships.freight.forEach(i => {
                if(i.companyDisplayName == 'ePacket')
                {
                    result = true
                }
            })
        }
    }).catch(err => {
        console.log(err)
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
                            data.push({
                                color_name: colors[i].color,
                                size_name: sizes[j],
                                main_image_url: colors[i].image,
                                standard_price: price[key],
                                product_description: des,
                                parent_child: 'Child',
                                relationship_type: 'variation',
                                variation_theme: 'SizeNameColorName',
                                parent_sku: parent_sku,
                                item_sku: parent_sku+'-cl'+(i+1)+'-size'+(j + 1),
                                swatch_image_url: colors[i].image+'_50x50.jpg'
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

                        data.push({
                            color_name: colors[i].color,
                            main_image_url: colors[i].image,
                            standard_price: price[keys[j]],
                            product_description: des,
                            parent_child: 'Child',
                            relationship_type: 'variation',
                            variation_theme: 'ColorName',
                            parent_sku: parent_sku,
                            item_sku: parent_sku+'-cl'+(i+1),
                            swatch_image_url: colors[i].image+'_50x50.jpg'
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
                    data.push({
                        size_name: sizes[j],
                        standard_price: price[key],
                        product_description: des,
                        parent_child: 'Child',
                        relationship_type: 'variation',
                        variation_theme: 'SizeName',
                        parent_sku: parent_sku,
                        item_sku: parent_sku+'-size'+(j+1),
                        main_image_url: main_image_url
                    })
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
            data['other_image_url'+(i)] = other_images
        }
    }
    return data
}


async function getInfoProduct(item_sku){
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
        let tradeMark = await checkTradeMark(brandName)


        let item_name = $('h1.product-name')[0].innerHTML.replace(new RegExp(branchName,'i'),'')

        // console.log(item_name)

        if(tradeMark == false)
        {

            //get mo ta san pham
            let image_data = getImage($)

            let des = await getDesc(urlGetDes,brandName)
            let specifics_bulletpoints = getSpecifics($)
            if(des.length+specifics_bulletpoints.specifics.length < 2000)
            {
                des +=specifics_bulletpoints.specifics
            }
            let products = []



            let price_data  = helper.getPrice($,skuProducts)

            if(Object.keys(price_data).length === 0)
            {
                // khong co bien the






                let price = parseFloat($('#j-sku-discount-price').text()) + 15
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
                }

                product = updateInfoProduct(product,image_data)
                product = updateInfoProduct(product,specifics_bulletpoints.bulletpoints)
                product.product_description = des
                product.item_sku = item_sku
                product.item_name = item_name
                product.standard_price = price
                products.push(product)
                products.forEach(item => {
                    console.log('khong bien the: ',item.item_sku)
                })
                putToServer(product)
            }
            else{

                let product_child = getColors($,price_data,des,item_sku)


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
                }
                product = updateInfoProduct(product,image_data)
                product =  updateInfoProduct(product,specifics_bulletpoints.bulletpoints)
                product.product_description = des
                product.item_sku = item_sku
                product.item_name = item_name

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
                        }
                        temp =  updateInfoProduct(temp,image_data)
                        // console.log(specifics_bulletpoints)
                        temp = updateInfoProduct(temp,specifics_bulletpoints.bulletpoints)
                        temp.product_description = des
                        temp.item_sku = item_sku
                        temp.item_name = item_name
                        temp.standard_price = item.standard_price
                        temp = updateInfoProduct(temp,item)
                        putToServer(temp)
                        products.push(temp)
                    })
                }
                products.forEach(item => {
                    console.log('Co bien the: ',item.item_sku)
                })
            }
        }
        else{
            console.log('co bi ban quyen')
        }
        //check thuong hieu

        // gia san pham
    })
}

function updateInfoProduct(product,info)
{
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
    axios.put('http://localhost:8000/api/product-aliexpress',data).then(data => {
        console.log('thanh cong')
    }).catch(err => {
        console.log('Thất bại')
    })
}
module.exports = router;
