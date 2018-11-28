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
    axios.get('https://www.aliexpress.com/item/Cat-Bed-Tortoise-Shape-Deformable-Dogs-Beds-Warm-Soft-Chien-Dog-House-Pet-Sleeping-Bag-Hondenmand/32844227167.html?ws_ab_test=searchweb0_0,searchweb201602_1_10065_10068_10890_10547_319_5734911_10546_10548_317_5730311_10696_10924_453_10084_454_10083_5729211_10618_10920_10921_10922_10307_537_536_5735011_10059_10884_5735111_10887_10928_100031_321_322_10103_5735211,searchweb201603_1,ppcSwitch_0&algo_expid=d739564c-0f83-48c1-858a-0d81ffaa0f0f-30&algo_pvid=d739564c-0f83-48c1-858a-0d81ffaa0f0f').then(async response => {
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
        // console.log(skuProducts)
        let textDetailDesc = $('script:contains(window.runParams.detailDesc)').text()
        index = textDetailDesc.indexOf('window.runParams.detailDesc')
        context = textDetailDesc.slice(index)
        context = context.replace('window.runParams.detailDesc="','')
        index = context.indexOf('"')
        context = context.slice(0,index)

        let item_sku = '123'
        let item_name = $('h1.product-name')[0].innerHTML

        
        let urlGetDes = context
        //check thuong hieu
        let branchName =  $('.product-property-list:eq(0)').find('li:contains(Brand Name)')
        if(branchName.length > 0)
        {
            branchName = branchName[0]
        }
        var brandName = $(branchName).find('span:eq(1)').text()
        if(await checkTradeMark(brandName) === false)
        {
            console.log('khong bi ban quyen')
            //get mo ta san pham
            let image_data = getImage($)
            
            let des = await getDesc(urlGetDes)
            let specific = getSpecifics($)
            if(des.length+specific.length < 2000)
            {
                des +=specific 
            }
            let products = []







            let price_data  = helper.getPrice($,skuProducts)
            if(Object.keys(price_data).length === 0)
            {

                // khong co bien the
                

                let price = parseFloat($('#j-sku-discount-price').text()) + 15
                let product = image_data
                product.standard_price = price
                product.product_description = des
                product.item_name = item_name
                products.push(product)
                console.log(products)
            }
            else{
                
                let product_info_price = getColors($,price_data,des,item_sku)


                let product = image_data
                product.product_description = des
                product.item_name = item_name
                products.push(product)
                let keys = Object.keys(image_data)

                keys.forEach(item => {
                    if(item != 'main_image_url')
                    {
                        product_info_price.forEach(value => {
                            value[item] = image_data[item]
                        })
                    }
                })
                products = products.concat(product_info_price)
                console.log(products)
            }
        }
        else{
            console.log('co bi ban quyen')
        }
        //check thuong hieu

        // gia san pham
        
            
            
        return res.send(response.data)
    })
});
router.get('/test',function(req,res,next){
    axios.get('https://www.aliexpress.com/wholesale?site=glo&g=y&SearchText=sleep+bag+pet&page=2').then(response => {
        const { window } = new JSDOM(response.data);
        const $ = require('jquery')(window);

    }).catch(err => {
        console.log(err)
    })
})








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
async function getDesc(url)
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
            return !item.includes('$')
        })
        des = text
    }).catch(err => {
        console.log(err)
    })
    
    return '<p>'+des.join('</p><p>')+'</p>'
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
    return '<p>'+specificsLisText.join('</p><p>')+'</p>'
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
                    keys.forEach(key => {
                        if(colors[i].color == key)
                        {
                            data.push({
                                color_name: colors[i].color,
                                main_image_url: colors[i].image,
                                standard_price: price[key],
                                product_description: des,
                                parent_child: 'Child',
                                relationship_type: 'variation',
                                variation_theme: 'ColorName',
                                parent_sku: parent_sku,
                                swatch_image_url: colors[i].image+'_50x50.jpg'
                            })
                        }
                    })
                
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
module.exports = router;
