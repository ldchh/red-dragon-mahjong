/* Unicode code points: one Han character or emoji counts as one character. */
(function (root) {
    'use strict';
    const message = '昵称需为 1–8 个汉字或字符';
    function validate(value) {
        const name = typeof value === 'string' ? value.trim() : '';
        const length = Array.from(name).length;
        const ok = length >= 1 && length <= 8 && !/[\p{Cc}\p{Cs}]/u.test(name);
        return {ok, name, length, message: ok ? '' : message};
    }
    const api = Object.freeze({validate, message});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.MahjongNickname = api;
})(globalThis);
