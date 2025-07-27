import { Box } from '@chakra-ui/react';
import React from 'react';

import EditBets from './components/EditBets';
import Footer from './Footer';
import Header from './Header';

const HomePage = React.memo(
  (): React.ReactElement => (
    <>
      <Header />

      <Box pt="7rem">
        <EditBets />
      </Box>

      <Footer />
    </>
  ),
);

HomePage.displayName = 'HomePage';

export default HomePage;
