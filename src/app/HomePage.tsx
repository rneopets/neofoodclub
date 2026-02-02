import { Box } from '@chakra-ui/react';
import React from 'react';

import EditBets from './components/views/EditBets';
import Footer from './Footer';
import Header from './Header';

const HomePage = React.memo(
  (): React.ReactElement => (
    <>
      <Header />

      <Box pt="7rem" w="100%" maxW="100%">
        <EditBets />
      </Box>

      <Footer />
    </>
  ),
);

HomePage.displayName = 'HomePage';

export default HomePage;
