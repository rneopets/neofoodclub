import { Box } from '@chakra-ui/react';
import React from 'react';

import { HelpGuideProvider } from './components/help/HelpGuideProvider';
import TopProgressBar from './components/ui/TopProgressBar';
import EditBets from './components/views/EditBets';
import Footer from './Footer';
import Header from './Header';

const HomePage = React.memo(
  (): React.ReactElement => (
    <HelpGuideProvider>
      <TopProgressBar />
      <Header />

      <Box pt="7rem" w="100%" maxW="100%">
        <EditBets />
      </Box>

      <Footer />
    </HelpGuideProvider>
  ),
);

HomePage.displayName = 'HomePage';

export default HomePage;
