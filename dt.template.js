/**
 * 解析表达式语法，可以用其它表达式引擎代替。
 * 主要提供两个方法：tpl()和compile()
 */
;
(function ($) {

    "use strict";

    $.domTemplate.template = (function () {
        /**
         * 模板执行引擎
         * @param template
         * @constructor
         */
        var TemplateEngine = function (template,options,escape) {
            var t = this;
            t.template = template;
            t.options=options||{};
            t.escape=escape||true;
            var codeExp = /\{([^}>]+)?}/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];', match, cursor = 0;

            var addCode = function (line, isJs) {

                isJs ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
                    (code += line !== '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
                return addCode;
            };

            /**
             * 编译模板
             * @param template
             * @param options
             * @param escape 是否转义
             * @returns string
             */
            function tpl(template, options,escape) {
                template = template || t.template;
                options=options|| t.options;
                escape=escape|| t.escape;
                if (typeof template !== 'string') {
                    throw new Error('Template must be a string');
                }
                options = $.extend({}, options, TemplateEngine.prototype.helpers);
                for (var name in options) {
                    code += 'var ' + name + '=this.' + name + ';';
                }
                while (match = codeExp.exec(template)) {
                    addCode(template.slice(cursor, match.index))(match[1], true);
                    cursor = match.index + match[0].length;
                }
                addCode(template.substr(cursor, template.length - cursor));
                code += 'return r.join("");';

                var result =new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
                if(escape){
                    return $.domTemplate.encodeHTML(result)
                } else {
                    return result;
                }
            };

            /**
             * 编译表达式
             * @param template
             * @param options
             * @returns {*}
             */
            function compile(template, options) {
                template = template || t.template;
                options=options|| t.options;
                if (typeof template !== 'string') {
                    throw new Error('Template must be a string');
                }
                options = $.extend({}, options, TemplateEngine.prototype.helpers);
                var functionBody = ""
                template = $.domTemplate.trim(template);
                for (var name in options) {
                    functionBody += 'var ' + name + '=this.' + name + ';';
                }
                functionBody += "return " + template.substr(0, template.length - 1).substr(1) + ";";
                return new Function(functionBody).apply(options);
            };

            t.tpl = function (template, options,escape) {
                return tpl(template, options,escape);
            };
            t.compile = function (template, options) {
                return compile(template, options);
            };
        };

        TemplateEngine.prototype = {
            helpers: {}
        };

        var template = function (template) {
            return  new TemplateEngine(template);
        };

        template.tpl = function (template, options,escape) {
            var instance =  new TemplateEngine(template,options,escape);
            return instance.tpl();
        };
        template.compile = function (template, options) {
            var instance =  new TemplateEngine(template,options);
            return instance.compile();
        };

        /**
         * 注册自定义函数
         * @param name 函数名称
         * @param fn 处理逻辑
         */
        $.domTemplate.registerHelper= template.registerHelper = function (name, fn) {
            TemplateEngine.prototype.helpers[name] = fn;
        };

        /**
         * 删除自定义函数
         * @param name
         */
        $.domTemplate.unregisterHelper= template.unregisterHelper = function (name) {
            TemplateEngine.prototype.helpers[name] = undefined;
            delete TemplateEngine.prototype.helpers[name];
        };
        return template;
    })();

})($);