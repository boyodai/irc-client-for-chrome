// http://www.irchelp.org/irchelp/ircii/server-numerics.txt
// ref. http://www.mirc.net/raws/
if (typeof(IRC) == 'undefined') var IRC = {};

IRC.Replies = {
  AWAY: '301',
  USERHOST: '302',
  ISON: '303',
  TEXT: '304',
  WHOISUSER: '311',
  WHOISSERVER: '312',
  WHOISOPERATOR: '313',
  WHOWASUSER: '314',
  WHOISCHANOP: '316',
  WHOISIDLE: '317',
  ENDOFWHOIS: '318',
  WHOISCHANNELS: '319',
  LISTSTART: '321',
  LIST: '322',
  LISTEND: '323',
  CHANNELMODEIS: '324',
  NOTOPIC: '331',
  TOPIC: '332',
  INVITING: '341',
  VERSION: '351',
  WHOREPLY: '352',
  ENDOFWHO: '315',
  NAMREPLY: '353',
  ENDOFNAMES: '366',
  KILLDONE: '361',
  LINKS: '364',
  ENDOFLINKS: '365',
  BANLIST: '367',
  ENDOFBANLIST: '368',
  INFO: '371',
  MOTD: '372',
  ENDOFMOTD: '376',
  YOUREOPER: '381',
  REHASHING: '382',
  YOURESERVICE: '383',
  MYPORTIS: '384',
  NOTOPERANYMORE: '385',
  TIME: '391',
  TRACELINK: '200',
  TRACECONNECTING: '201',
  TRACEHANDSHAKE: '202',
  TRACEUNKNOWN: '203',
  TRACEOPERATOR: '204',
  TRACEUSER: '205',
  TRACESERVER: '206',
  TRACESERVICE: '207',
  TRACENEWTYPE: '208',
  TRACECLASS: '209',
  STATSLINKINFO: '211',
  STATSCOMMANDS: '212',
  STATSCLINE: '213',
  STATSNLINE: '214',
  STATSILINE: '215',
  STATSKLINE: '216',
  STATSQLINE: '217',
  STATSYLINE: '218',
  ENDOFSTATS: '219',
  UMODEIS: '221',
  SERVICEINFO: '231',
  ENDOFSERVICES: '232',
  SERVICE: '233',
  SERVLIST: '234',
  SERVLISTEND: '235',
  STATSLLINE: '241'
};

IRC.isReply = function(command) {
  return command.match(/^[23]\d{2}$/);
};
