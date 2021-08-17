const io = require('socket.io')

module.exports = httpServer => {

    const server = io(httpServer)
    const user2socket = {}
    const socket2user = {}

    let currentGame = null

    server.on('connection', socket => {

        // 【事件】检查昵称是否已占用
        // ------------------------------------------------------------
        socket.on('check_user_exist', (nickname, callback) => {
            callback(!!user2socket[nickname])
        })

        // 【事件】用户进入游戏
        // ------------------------------------------------------------
        socket.on('enter', (nickname) => {
            const sid = socket.id

            // 添加用户信息
            user2socket[nickname] = sid
            socket2user[sid] = nickname

            // 发送用户列表给当前用户
            socket.emit('room_info', {
                nicknames: Object.keys(user2socket),
                holder: currentGame?.holder,
                lines: currentGame?.lines || []
            })

            // 发送新进用户给其他用户
            socket.broadcast.emit('user_enter', nickname)
        })

        // 【事件】用户离开游戏
        // ------------------------------------------------------------
        socket.on('leave', () => {
            const sid = socket.id
            const nickname = socket2user[sid]

            // 移除用户信息
            delete user2socket[nickname]
            delete socket2user[sid]

            // 如果当前离开的是游戏主持人
            if (currentGame && currentGame.holder === nickname) {
                currentGame = null
            }

            // 发送离开用户给其他用户
            socket.broadcast.emit('user_leave', nickname)
        })

        // 【事件】申请开始游戏
        // ------------------------------------------------------------
        socket.on('start_game', (finalAnswer) => {
            if (currentGame) {
                // 游戏已经处于开始状态了
                socket.emit('already_started', currentGame.holder)
                return
            }

            // 游戏可以开始：设置当前游戏信息
            currentGame = {
                success: false,
                holder: socket2user[socket.id],
                finalAnswer,
                lines: []
            }

            server.of('/').emit('game_started', currentGame.holder)
        })

        // 【事件】申请终止游戏
        // ------------------------------------------------------------
        socket.on('stop_game', () => {
            const nickname = socket2user[socket.id]

            if (currentGame && nickname === currentGame.holder) {
                currentGame = null
                server.of('/').emit('game_stoped')
            }
        })

        // 【事件】用户回答答案
        // ------------------------------------------------------------
        socket.on('answer_game', (answer) => {
            if (!currentGame) return

            if (currentGame.success) {
                socket.emit('game_answered', {
                    alreadyDone: true
                })
            } else {
                const success = currentGame.finalAnswer === answer

                if (success) {
                    currentGame.success = true
                }

                server.of('/').emit('game_answered', {
                    alreadyDone: false,
                    success,
                    nickname: socket2user[socket.id],
                    answer
                })
            }
        })

        // 【事件】用户绘图
        // ------------------------------------------------------------
        socket.on('new_line', (line) => {
            if (currentGame?.lines) {
                currentGame.lines.push(line)
                socket.broadcast.emit('starting_line', line)
            }
        })

        socket.on('update_line', (line) => {
            if (currentGame?.lines) {
                currentGame.lines[currentGame.lines.length - 1] = line
                socket.broadcast.emit('updating_line', line)
            }
        })

        // 【事件】客户端断开连接
        // ------------------------------------------------------------
        socket.on('disconnect', () => {
            const sid = socket.id
            const nickname = socket2user[sid]

            delete user2socket[nickname]
            delete socket2user[sid]

            // 如果当前离开的是游戏主持人
            if (currentGame && nickname === currentGame.holder) {
                currentGame = null
            }

            // 发送离开的用户信息给其他用户
            socket.broadcast.emit('user_leave', nickname)
        })

        // ------------------------------------------------------------
    })

}