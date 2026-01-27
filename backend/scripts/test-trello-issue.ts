import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

async function setupTrelloTest() {
  if (!TRELLO_KEY || !TRELLO_TOKEN) {
    console.error('Missing Trello configuration in .env');
    console.log('Required: TRELLO_KEY, TRELLO_TOKEN');
    return;
  }

  try {
    console.log('--- Trello Setup & Test ---');

    // 1. Get user's boards to find/create one
    console.log('Fetching your boards...');
    const boardsResponse = await axios.get(
      `https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
    );

    let board = boardsResponse.data.find(
      (b: any) => b.name === 'VibeCheck Tests',
    );

    if (!board) {
      console.log('Board "VibeCheck Tests" not found. Creating one...');
      const createBoardResponse = await axios.post(
        `https://api.trello.com/1/boards/?name=VibeCheck+Tests&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      );
      board = createBoardResponse.data;
      console.log(`Created board: ${board.name} (${board.id})`);
    } else {
      console.log(`Using existing board: ${board.name} (${board.id})`);
    }

    // 2. Get lists on this board
    console.log('Fetching lists on board...');
    const listsResponse = await axios.get(
      `https://api.trello.com/1/boards/${board.id}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
    );

    let list = listsResponse.data[0]; // Just take the first list (usually "To Do")

    if (!list) {
      console.log('No lists found. Creating a "To Do" list...');
      const createListResponse = await axios.post(
        `https://api.trello.com/1/lists?name=To+Do&idBoard=${board.id}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      );
      list = createListResponse.data;
    }

    console.log(`Target List: ${list.name} (${list.id})`);

    // 3. Create a test card (Issue)
    console.log('\nCreating a test card (issue)...');
    const cardResponse = await axios.post(
      `https://api.trello.com/1/cards?idList=${list.id}&name=Test+Bug+Issue&desc=This+is+a+test+issue+generated+automatically+from+the+script.&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
    );

    console.log('Success! Card created.');
    console.log(`Card Name: ${cardResponse.data.name}`);
    console.log(`Card URL: ${cardResponse.data.shortUrl}`);

    console.log('\n--- Test Data ---');
    console.log(
      `Add these to your .env if you want to target this board/list specifically:`,
    );
    console.log(`TRELLO_BOARD_ID=${board.id}`);
    console.log(`TRELLO_LIST_ID=${list.id}`);
  } catch (error: any) {
    console.error('Trello API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

setupTrelloTest();
