var client = require('cheerio-httpcli');
process.env.HTTP_PROXY = 'http://192.168.122.99:3128';
var items = [] ;

function getItemName( text ){
    if(text.indexOf('-') != -1 )
        text = text.substr(1,text.indexOf('-')-1);
    if(text.indexOf(']') != -1 )
        text = text.substr(0,text.indexOf(']'));
    if(text.indexOf(' ') != -1)
        text = text.substr(0,text.indexOf(' '));
    return text;
}

function getOrderNum( text ){
    text = text.substr(text.indexOf(']'));
    text = text.substr(text.indexOf('[')+1);
    text = text.substr(0,text.indexOf(']'));
    return text;
}

function makeData( item_name, item_num ) {
    var item_url = "http://akizukidenshi.com/catalog/g/g" + item_num + "/";
    var type = "";
    if( item_name.indexOf('2SA') != -1 || 
        item_name.indexOf('2SB') != -1 || 
        item_name.indexOf('2PB') != -1 ||
        item_name.indexOf('MMBT3906') != -1 ||
        item_name.indexOf('RT1') != -1
        )
        type = 'PNP';

    if( item_name.indexOf('2SC') != -1||
        item_name.indexOf('2SD') != -1|| 
        item_name.indexOf('2PD') != -1 || 
        item_name.indexOf('MMBT3904') != -1 || 
        item_name.indexOf('TTC') != -1 || 
        item_name.indexOf('RN5') != -1
        )
        type = 'NPN';

    var keyword = item_name+" "+ type +" Transistor AKIZUKI "+ item_num ;
    var ret = { 
        name: item_name, 
        data: '', 
        type: type,
        package: '',
        keyword: keyword,
        url: item_url
    };
    if( type == "" )
        console.log(ret);
    return ret;
}

function zenkakuToHankaku(str) {
  var regex = /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g;

  // 全角を半角の文字に置換
  var val = str.replace(regex, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  })
  .replace(/[‐－―]/g, '-') // ハイフンなど
  .replace(/[～〜]/g, '-')  // チルダ
  .replace(/[　◆■※]/g, ' ');

  return val;
}

function wordUni(str){
    var val = str.replace("VCBO","Vcb")
    .replace("VCEO","Vce")
    .replace("VEBO","Vbe")
    .replace("IC","Ic")
    .replace("PC","Pc");
  return val;       
}


client.fetch('http://akizukidenshi.com/catalog/c/cctr/')
    .then( function (res) {
        $ = res.$;
        $('td').each(function () {            
            var text = $(this).text();
            if( text.indexOf('[') == 0 ) {
                var item_name = getItemName(text);
                var item_num = getOrderNum(text);
                if( !(item_name in items))
                    items[item_name] = makeData(item_name,item_num);
            }
        });
        return client.fetch('http://akizukidenshi.com/catalog/c/cctr_p2/');
    })
    .then( function (res) {
        $ = res.$;
        $('td').each(function () {
            var text = $(this).text();
            if( text.indexOf('[') == 0 ) {
                var item_name = getItemName(text);
                var item_num = getOrderNum(text);
                if( !(item_name in items))
                    items[item_name] = makeData(item_name,item_num);
            }
        });
        return client.fetch('http://akizukidenshi.com/catalog/c/cctr_p3/');
    })
    .then( function (res) {
        $ = res.$;
        $('td').each(function () {
            var text = $(this).text();
            if( text.indexOf('[') == 0 ) {
                var item_name = getItemName(text);
                var item_num = getOrderNum(text);
                if( !(item_name in items))
                    items[item_name] = makeData(item_name,item_num);
            }
        });
    })
    .then( function(res) {
        var item_array = [];
        for( key in items ) {
            item_array.push(items[key]);
        }

        setTimeout(function getData (array, i, resolve){
            var dataPage = client.fetchSync(array[i].url);
            var $ = dataPage.$;
            var content = $('table').eq(7).children().eq(2).children().text();
            content = zenkakuToHankaku(content);
            content = wordUni(content);
            var tmp = "";
            var data = "";
            if(content.indexOf("Vce") != -1) {
                tmp = content.substr(content.indexOf("Vce"));
                data += tmp.split(/\r\n|\r|\n/)[0] + ", ";
            }
            if(content.indexOf("Vcb") != -1) {
                tmp = content.substr(content.indexOf("Vcb"));
                data += tmp.split(/\r\n|\r|\n/)[0] + ", ";
            }
            if(content.indexOf("Veb") != -1) {
                tmp = content.substr(content.indexOf("Veb"));
                data += tmp.split(/\r\n|\r|\n/)[0] + ", ";
            }
            if(content.indexOf("Ic") != -1) {
                tmp = content.substr(content.indexOf("Ic"));
                data += tmp.split(/\r\n|\r|\n/)[0] + ", ";
            }
            if(content.indexOf("Pc") != -1) {
                tmp = content.substr(content.indexOf("Pc"));
                data += tmp.split(/\r\n|\r|\n/)[0] + ", ";
            }
            data += array[i].type + ", Small Signal Transistor";

            if(content.indexOf("パッケージ") != -1) {
                tmp = content.substr(content.indexOf("パッケージ")+6);
                array[i].package = tmp.split(/\r\n|\r|\n/)[0];
                data += " ," + array[i].package;
            }

            //不要な全角類を削除
            data = data
            .replace(/[\[\]\(\)\{\}]/g, '') // 不要かっこ
            .replace(/[^\x00-\x7E]+/g,''); //全角削除

            array[i].data = data;

            console.log("#");
            console.log("$CMP " + array[i].name);
            console.log("D " + array[i].data);
            console.log("K " + array[i].keyword);
            console.log("F " + array[i].url);
            console.log("$ENDCMP");
            if( ++i < array.length ) {
                setTimeout( getData, 500, array, i, resolve);
            } else {
                resolve(array);
            }
        },100,item_array, 0, function resolve (array) { 
            console.log(array.length + ' items finished!'); 
            array.forEach(function(item) {
                console.log("|" + item.name + "|" + item.type + "|" + item.package + "|" + item.data + "|[AKIZUKI](" + item.url +")|");
            } );
        });
    });
    

