/**
 * 扩展函数
 */
(function ($) {

    "use strict";
    /**
     * 对日期进行格式化，
     * @param date 要格式化的日期
     * @param format 进行格式化的模式字符串
     *     支持的模式字母有：
     *     y:年,
     *     M:年中的月份(1-12),
     *     d:月份中的天(1-31),
     *     h:小时(0-23),
     *     m:分(0-59),
     *     s:秒(0-59),
     *     S:毫秒(0-999),
     *     q:季度(1-4)
     * @return String
     * @author yanis.wang
     * @see	http://yaniswang.com/frontend/2013/02/16/dateformat-performance/
     */
    function dateFormat(date, format) {
        if(typeof date==='string'){
            if(date.length===10){
                date+='000';
            }
            date=parseInt(date);
        }else if(!isNaN(date) && date.toString().length===10){
            date*=1000;
        }
        date = new Date(date);

        var map = {
            "M": date.getMonth() + 1, //月份
            "d": date.getDate(), //日
            "h": date.getHours(), //小时
            "m": date.getMinutes(), //分
            "s": date.getSeconds(), //秒
            "q": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };
        format = format.replace(/([yMdhmsqS])+/g, function(all, t){
            var v = map[t];
            if(v !== undefined){
                if(all.length > 1){
                    v = '0' + v;
                    v = v.substr(v.length-2);
                }
                return v;
            }
            else if(t === 'y'){
                return (date.getFullYear() + '').substr(4 - all.length);
            }
            return all;
        });
        return format;
    }

    $.domTemplate.registerHelper('fn', {
        dateFormat: function (value, pattern) {
            return dateFormat(value, pattern || 'yyyy-MM-dd');
        },
        toList: function (obj) {
            if (typeof obj === "undefined") {
                return [];
            } else if ($.domTemplate.isArray(obj)) {
                return obj;
            } else {
                return [obj];
            }
        },
        defaultIsEmpty: function (value, defaultStr) {
            if (typeof value === "undefined" || defaultStr == '') {
                return defaultStr;
            } else {
                return value;
            }
        }
    });

    $.domTemplate.registerHelper('dateFormat', function (value, pattern) {
        return dateFormat(value, pattern || 'yyyy-MM-dd');
    });

})($);