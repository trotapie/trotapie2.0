import {destinationsDefinition} from '../../../destinations/models/destinations-definition';
import {hotelsDefinition} from '../../../hotels/models/hotels-definition';
import {clientsDefinition} from '../../../clients/models/clients-definition';
import {employeesDefinition} from '../../../employees/models/employees-definition';
import {circuitsDefinition} from '../../../circuits/models/circuits-definition';
import {configurationDefinition} from '../../../configuration/models/configuration-definition';
import type {ResourceDefinition} from '../../../../shared/models/resource-definition';
export const definitions:Record<string,ResourceDefinition>=Object.fromEntries([destinationsDefinition,hotelsDefinition,clientsDefinition,employeesDefinition,circuitsDefinition,configurationDefinition].map(d=>[d.kind,d]));
