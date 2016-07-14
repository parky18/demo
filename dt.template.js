/**
 * 解析表达式语法，可以用其它表达式引擎代替。
 * 主要提供两个方法：tpl()和compile()
 */
;(function ($) {

    "use strict";

    $.domTemplate.template = (function () {
        /**
         * 模板执行引擎
         * @param template
         * @constructor
         */
        var TemplateEngine = function (template, options, escape) {
            var t = this;
            t.template = template;
            t.options = options || {};
            t.escape = typeof escape === "undefined" ? true : escape;

            var codeExp = /\{([^}>]+)?}/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[]; with(this){', match, cursor = 0;

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
            function tpl(template, options, escape) {
                template = template || t.template;
                options = options || t.options;
                escape = typeof escape === "undefined" ? t.escape : escape;
                if (typeof template !== 'string') {
                    throw new Error('Template must be a string');
                }
                options = $.extend({}, options, TemplateEngine.prototype.helpers);
                while (match = codeExp.exec(template)) {
                    addCode(template.slice(cursor, match.index))(match[1], true);
                    cursor = match.index + match[0].length;
                }
                addCode(template.substr(cursor, template.length - cursor));
                code += 'return r.join(""); }';
                var result = new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
                if (escape) {
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
                options = options || t.options;
                if (typeof template !== 'string') {
                    throw new Error('Template must be a string');
                }
                options = $.extend({}, options, TemplateEngine.prototype.helpers);
                var functionBody = "with(this){"
                template = $.domTemplate.trim(template);
                functionBody += "return " + template.substr(0, template.length - 1).substr(1) + "; }";
                return new Function(functionBody).apply(options);
            };

            t.tpl = function (template, options, escape) {
                return tpl(template, options, escape);
            };
            t.compile = function (template, options) {
                return compile(template, options);
            };
        };

        TemplateEngine.prototype = {
            helpers: {}
        };

        var template = function (template) {
            return new TemplateEngine(template);
        };

        template.tpl = function (template, options, escape) {
            var instance = new TemplateEngine(template, options, escape);
            return instance.tpl();
        };
        template.compile = function (template, options) {
            var instance = new TemplateEngine(template, options);
            return instance.compile();
        };

        function _registerHelper(namespace, name, fn) {
            var length = arguments.length;
            fn = arguments[length - 1];
            if (!$.domTemplate.isFunction(fn)) {
                throw new Error('this last  argument must be a function');
            }
            if (length == 3 && namespace) {//有命名空间
                if (!TemplateEngine.prototype.helpers[namespace]) {
                    TemplateEngine.prototype.helpers[namespace] = {};
                }
                TemplateEngine.prototype.helpers[namespace][name] = fn;
            } else {
                TemplateEngine.prototype.helpers[namespace] = fn;
            }
        }

        /**
         * 注册自定义函数
         * @param namespace 命名空间
         * @param name 函数名称
         * @param fn 处理逻辑
         */
        $.domTemplate.registerHelper = template.registerHelper = function (namespace, name, fn) {
            var length = arguments.length;
            if (length == 0) {
                throw new Error('arguments length must be >0');
            }
            var lastArg = arguments[length - 1];
            var functionName, isObj = lastArg.length === undefined;
            if (isObj) {
                namespace = length == 1 ? undefined : namespace;
                for (functionName in lastArg) {
                    _registerHelper(namespace, functionName, lastArg[functionName]);
                }
            } else if(length==2){
                _registerHelper(namespace, lastArg);
            }else if(length==3){
                _registerHelper(namespace, name,lastArg);
            }
        };


        /**
         * 删除自定义函数
         * @param namespace 命名空间
         * @param name 函数名称
         */
        $.domTemplate.unregisterHelper = template.unregisterHelper = function (namespace, name) {
            if (1 in arguments) {//有命名空间
                if (TemplateEngine.prototype.helpers[namespace]) {
                    TemplateEngine.prototype.helpers[namespace][name] = undefined;
                    delete TemplateEngine.prototype.helpers[namespace][name];
                }
            } else {
                TemplateEngine.prototype.helpers[namespace] = undefined;
                delete TemplateEngine.prototype.helpers[namespace];
            }
        };
        return template;
    })();

})($);