function solveSudoku(board) {
    // 判断当前数独是否有效
    function isValid(board, row, col, num) {
        // 检查行是否有效
        for (let j = 0; j < 9; j++) {
            if (board[row][j] === num) {
                return false;
            }
        }
        // 检查列是否有效
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) {
                return false;
            }
        }
        // 检查3x3宫格是否有效
        let startRow = Math.floor(row / 3) * 3;
        let startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] === num) {
                    return false;
                }
            }
        }
        return true;
    }

    // 回溯函数
    function backtrack(board) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === '.') { // 找到一个空白位置
                    for (let num = '1'; num <= '9'; num++) { // 尝试填入1-9
                        if (isValid(board, i, j, num)) {
                            board[i][j] = num; // 做出选择
                            if (backtrack(board)) { // 递归调用
                                return true; // 如果找到解，直接返回
                            }
                            board[i][j] = '.'; // 撤回选择
                        }
                    }
                    return false; // 尝试所有数字都不行，返回false
                }
            }
        }
        return true; // 所有位置都填满，且有效，返回true
    }

    backtrack(board);
    return board;
}

// 示例数独
let board = [
    ["5", "3", ".", ".", "7", ".", ".", ".", "."],
    ["6", ".", ".", "1", "9", "5", ".", ".", "."],
    [".", "9", "8", ".", ".", ".", ".", "6", "."],
    ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
    ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
    ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
    [".", "6", ".", ".", ".", ".", "2", "8", "."],
    [".", ".", ".", "4", "1", "9", ".", ".", "5"],
    [".", ".", ".", ".", "8", ".", ".", "7", "9"]
];

console.log(solveSudoku(board));
