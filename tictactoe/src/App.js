import React, { useState, useEffect } from 'react';
import styles from './App.module.css';
import axios from 'axios';

// Funções de manipulação do estado mais recente do tabuleiro
function sendBoardStatus (array) {
  const arrayConverted = array.map(function(value){
    return value === null ? 0 :
           value === "X" ? 1 :
           value === "O" ? -1 :
           value;
  })
  // const arrayConverted = array.map(value => value === null ? 0 : value )
  console.log(arrayConverted)
  // array.forEach(func)
  sendArrayToServer(arrayConverted);
}

const sendArrayToServer = async (arrayData) => {
  try {
    const response = await axios.post('http://127.0.0.1:5000/verifyState', arrayData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Resposta do servidor:', response.data);
  } catch (error) {
    console.error('Erro ao enviar o array:', error);
  }
};

// Componente Square com destaque para os quadrados vencedores
const Square = ({ value, onClick, isWinning }) => (
  <button
    className={`${styles.square} ${isWinning ? styles.winningSquare : ''}`}
    onClick={onClick}
  >
    {value}
  </button>
);

// Componente Board com lógica de jogo e destaque para a linha vencedora
const Board = ({ onNewGame, winnerCount }) => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameStatus, setGameStatus] = useState(null);
  const [winningLine, setWinningLine] = useState([]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return { winner: null, line: [] };
  };

  // Essa função será o "gatilho" para o envio do estado do tabuleiro para
  // para o servidor
  // Necessário alterá-la para que seja passado um array com 9 elementos (o estado
  // atual de cada posicao do tabuleiro) para a funcao sendBoardStatus(), que realiza a requisição
  // Importante: os valores em branco no tabuleiro devem ser passados como -1, não como null
  
  const handleClick = (i) => {
    const newSquares = squares.slice();
    if (gameStatus || squares[i]) return;
    newSquares[i] = xIsNext ? 'X' : 'O';
    setSquares(newSquares);
    setXIsNext(!xIsNext);
    const { winner, line } = calculateWinner(newSquares);
    if (winner) {
      setGameStatus(`Winner: ${winner}`);
      setWinningLine(line);
      winnerCount(winner);
    } else if (!newSquares.includes(null)) {
      setGameStatus('Draw');
    } else {
      setGameStatus(null);
      setWinningLine([]);
    }
    sendBoardStatus(newSquares)
  };

  const renderSquare = (i) => (
    <Square
      key={i}
      value={squares[i]}
      onClick={() => handleClick(i)}
      isWinning={winningLine.includes(i)}
    />
  );

  const handleRestart = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameStatus(null);
    setWinningLine([]);
  };

  const handleNewGame = () => {
    handleRestart();
    onNewGame();
  };

  return (
    <div>
      <div className={styles.status}>{gameStatus || `Next player: ${xIsNext ? 'X' : 'O'}`}</div>
      <div className={styles.boardRow}>
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
      </div>
      <div className={styles.boardRow}>
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
      </div>
      <div className={styles.boardRow}>
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
      <button className={styles.restartButton} onClick={handleRestart}>
        Recomeçar
      </button>
      {gameStatus && (
        <button className={styles.newGameButton} onClick={handleNewGame}>
          Começar Outra Partida
        </button>
      )}
    </div>
  );
};

function App() { 
  
  const [winCounts, setWinCounts] = useState({ X: 0, O: 0 });

  const handleWinnerCount = (winner) => {
    setWinCounts((prevCounts) => ({
      ...prevCounts,
      [winner]: prevCounts[winner] + 1,
    }));
  };

  const handleNewGame = () => {
    // No action needed for this button, it's just for restarting the game
  };

  return (
    <div className={styles.App}>
      <h1>Tic Tac Toe</h1> 
      <Board onNewGame={handleNewGame} winnerCount={handleWinnerCount} />
      <div className={styles.scoreBoard}>
        <p>X Wins: {winCounts.X}</p>
        <p>O Wins: {winCounts.O}</p>
      </div>
    </div>
  );
}

export default App;
