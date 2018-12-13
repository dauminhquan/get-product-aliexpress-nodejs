module.exports = {
    getPrice($,skuProducts,price_ship,multiplication){
        let dls = $("#j-product-info-sku").find("dl")
        let dlsData = []
        let text = ""
        for(let i = 0; i< dls.length ; i++)
        {
            if(!$(dls[i]).find("dt:eq(0)").text().includes("Ships From"))
            {
                text+="," +$(dls[i]).find("dt:eq(0)").text()
            }
            let item = $(dls[i]).find("li")
            let itemData = []
            for(let j = 0 ;j<item.length;j++)
            {
                let skuId = $(item[j]).find("a:eq(0)").attr("data-sku-id")
                let textValue = ""
                let image = $(item[j]).find("a:eq(0)").find("img:eq(0)")
                if(image.length > 0)
                {
                    textValue = $(image).attr("title")
                }
                else{
                    textValue = $(item[j]).find("a:eq(0)").text()
                }

                itemData.push(
                    {
                        text: textValue,
                        skuId: skuId
                    }
                )

            }
            dlsData.push(itemData)
        }
        text = text.slice(1)
        let p = [];

        if(dlsData.length > 0)
        {
            noi_mang(p,"","",dlsData,0)
        }
        let price_text = {
            text: text,
            price: p
        }
        let price_text_data = {}
        price_text.price.forEach(item => {

            let getPriceData = skuProducts.find(value => {
                return value.skuPropIds == item.price
            })
            if(getPriceData != undefined)
            {
                price_text_data[item.text] = getPriceData.skuVal.actSkuMultiCurrencyDisplayPrice == undefined ? ((parseInt(getPriceData.skuVal.skuMultiCurrencyDisplayPrice) + parseInt(price_ship)) * multiplication + 1.99) : ((parseInt(getPriceData.skuVal.actSkuMultiCurrencyDisplayPrice) + parseInt(price_ship)) * multiplication + 1.99)
            }
        })
        return price_text_data
    }
};


function noi_mang(p,text,skuId,mang,index) {
    if(index < mang.length-1)
    {
        for(let j = 0 ; j< mang[index].length ; j ++)
        {
            noi_mang(p,text+","+mang[index][j].text,skuId+","+mang[index][j].skuId,mang,index+1)
        }
    }
    else{
        for(let j = 0 ; j< mang[index].length ; j ++)
        {
            if(!mang[index][j].text.includes("Russian"))
            {
                if(mang[index][j].text.includes("China"))
                {
                    p.push({
                        text: text.slice(1),
                        price: (skuId+","+mang[index][j].skuId).slice(1),
                    })
                }
                else{
                    p.push({
                        text: (text+","+mang[index][j].text).slice(1),
                        price: (skuId+","+mang[index][j].skuId).slice(1),
                    })
                }

            }
        }
    }
}
